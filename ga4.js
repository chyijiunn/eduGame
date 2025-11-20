/* /eduGame/ga4.js —— 共用 GA4 載入器 */
(function(ID){
  // 載入 gtag
  var s=document.createElement('script');
  s.async=true;
  s.src='https://www.googletagmanager.com/gtag/js?id='+ID;
  document.head.appendChild(s);

  // 初始化
  window.dataLayer=window.dataLayer||[];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag=gtag;
  gtag('js', new Date());
  gtag('config', ID, {
    // 想要再加設定（如 anonymize_ip）可寫在這裡
    // 'anonymize_ip': true
  });

  // 可選：出站連結事件
  document.addEventListener('click', e=>{
    const a=e.target.closest('a[href]');
    if(!a) return;
    if(a.origin!==location.origin){
      gtag('event','outbound_click',{ link_url:a.href, transport_type:'beacon' });
    }
  }, {capture:true});
})('G-VH783QEV6Z');  // ←←← 在這裡換成你的測量 ID
