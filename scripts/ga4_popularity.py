#!/usr/bin/env python3
"""Fetch aggregated game page views from GA4 and generate a public ranking JSON."""
import argparse
import json
import posixpath
import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Filter, FilterExpression, Metric, RunReportRequest

SITE = 'https://chyijiunn.github.io/eduGame/'
HOST = 'chyijiunn.github.io'
PREFIX = '/eduGame/games/'
TAIPEI = timezone(timedelta(hours=8))


def canonical(path):
    value = unquote(urlsplit(path).path)
    if value.endswith('/index.html'):
        value = value[:-11]
    value = value.rstrip('/')
    return posixpath.normpath(value or '/')


def read_games(filename):
    source = Path(filename).read_text(encoding='utf-8')
    match = re.search(r'\bconst\s+GAME_LIST\s*=\s*\[([\s\S]*?)\n\s*\];', source)
    if not match:
        raise ValueError('GAME_LIST not found in root index.html')
    games = []
    for block in re.finditer(r'\{\s*id:\s*["\']([^"\']+)["\']([\s\S]*?)\n\s*\}', match.group(1)):
        gid, item = block.group(1), block.group(2)
        url = re.search(r'\burl:\s*["\']([^"\']+)["\']', item)
        name = re.search(r'\bname:\s*["\']([^"\']+)["\']', item)
        if not url or not name:
            continue
        path = canonical(urljoin(SITE, url.group(1)))
        if path.startswith(PREFIX):
            games.append({'id': gid, 'name': name.group(1), 'path': path})
    if len(games) < 20 or len({g['id'] for g in games}) != len(games):
        raise ValueError(f'Invalid or incomplete GAME_LIST ({len(games)} entries)')
    return games


def game_for_path(path, games):
    # Longer paths first, so /games/x/sub-page won't be mistaken for /games/x.
    for game in games:
        root = game['path']
        if path == root or (not root.endswith('.html') and path.startswith(root + '/')):
            return game['id']
    return None


def query_page_views(property_id, start_date, end_date):
    client = BetaAnalyticsDataClient()
    totals = Counter()
    offset = 0
    while True:
        result = client.run_report(RunReportRequest(
            property=f'properties/{property_id}',
            dimensions=[Dimension(name='hostName'), Dimension(name='pagePath')],
            metrics=[Metric(name='screenPageViews')],
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            dimension_filter=FilterExpression(and_group={
                'expressions': [
                    FilterExpression(filter=Filter(field_name='hostName', string_filter=Filter.StringFilter(
                        match_type=Filter.StringFilter.MatchType.EXACT, value=HOST))),
                    FilterExpression(filter=Filter(field_name='pagePath', string_filter=Filter.StringFilter(
                        match_type=Filter.StringFilter.MatchType.BEGINS_WITH, value=PREFIX))),
                ]
            }),
            limit=10000,
            offset=offset,
        ))
        for row in result.rows:
            hostname, path = [value.value for value in row.dimension_values]
            if hostname == HOST:
                totals[canonical(path)] += int(row.metric_values[0].value or 0)
        offset += len(result.rows)
        if not result.rows or offset >= result.row_count:
            break
    return totals


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--index', default='index.html')
    parser.add_argument('--output', default='popularity.json')
    parser.add_argument('--property', default='513884931')
    args = parser.parse_args()
    games = read_games(args.index)
    # Query two independent periods; GA4 only returns data collected since tracking began.
    recent_views = query_page_views(args.property, '30daysAgo', 'yesterday')
    all_time_views = query_page_views(args.property, '2020-01-01', 'yesterday')
    registered = sorted(games, key=lambda g: len(g['path']), reverse=True)
    def make_ranking(page_views):
        counts = Counter()
        for path, views in page_views.items():
            game_id = game_for_path(path, registered)
            if game_id:
                counts[game_id] += views
        ranked = sorted(games, key=lambda g: (-counts[g['id']], g['id']))
        rows = [{'rank': index, 'id': game['id'], 'name': game['name'], 'views': counts[game['id']]}
                for index, game in enumerate(ranked, 1)]
        return rows, sum(counts[g['id']] > 0 for g in games)

    recent_rows, recent_matched = make_ranking(recent_views)
    all_time_rows, all_time_matched = make_ranking(all_time_views)
    now = datetime.now(TAIPEI)
    data = {
        'schemaVersion': 2,
        'generatedAt': now.isoformat(timespec='seconds'),
        'timeZone': 'Asia/Taipei',
        'period': {'start': (now.date() - timedelta(days=30)).isoformat(),
                   'end': (now.date() - timedelta(days=1)).isoformat()},
        'allTimePeriod': {'start': '2020-01-01',
                          'end': (now.date() - timedelta(days=1)).isoformat()},
        'metric': 'screenPageViews',
        'source': 'GA4',
        'registeredGames': len(games),
        'matchedGames': recent_matched,
        'allTimeMatchedGames': all_time_matched,
        # Keep 'top' for older island consumers, now including every game.
        # The first 10 rows are the recent Top 10.
        'top': recent_rows,
        'allTime': all_time_rows,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Generated {output}: {len(games)} games, recent={recent_matched}, allTime={all_time_matched}.')


if __name__ == '__main__':
    main()
