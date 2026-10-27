# Bellows Camera v0.1 — Guide

## Scope
A parametric prototype for interchangeable single-sheet paper holders, front/rear frames and ribbed tapered bellows. Defaults: 63.5 × 88.9 mm paper, 1 mm borders, 3 mm structural board, 150 mm focal length. Lens, rail and tripod are illustrative; rail/tripod are not cutting parts. Build one holder, test its light seals, and make a full-size paper bellows model before producing a batch.

## Controls and persistence
Use the three top tabs. Values update the model and export geometry immediately. Drag to orbit; right-drag to pan; scroll to zoom. Touch: one finger orbits, two fingers pan/pinch. Home fits the model; front/side views, exploded view and section view reveal construction. Focusing a field highlights its part and shows an anchored callout; Enter/Esc dismiss it. The globe switches languages; the i button opens this guide.

Parameters, language, tab and view are stored in localStorage on this browser and origin. File URL persistence varies by browser; moving/renaming the HTML may change its storage. Export/import JSON for portable backups. Reset affects only this application. Blocked storage is reported in the status bar.

## 1 — Paper Holder (new design)
The stack comprises a front locating plate, thin dark-slide spacers, opaque aperture mask, paper pocket and removable back. Main board thickness t, slide thickness ts, slide clearance cs, paper thickness tp, mask thickness tm and paper clearance cp are independent. A 3 mm board cannot substitute for every thin spacer.

Pw/Ph are measured paper dimensions. Margin m defines the nominal opaque overlap on each edge; image size is Pw−2m by Ph−2m. Paper-pocket clearance is cp overall. Cutting and seating tolerances affect border uniformity. A transparent acrylic retainer alone does not create a white border: use a separate opaque mask. Add a thin compliant backing pad as required to keep the sheet flat against its locating plane.

The slide gap is ts+cs. Add manually fitted, staggered black felt/flexible sealing lips at the slide mouth; a plain slot is not light-tight. A removable taped or clamped back requires perimeter seals. Guide lines indicate seal positions, not cut grooves. This prototype does not provide an automatic holder interlock. Number each holder and mark the two slide faces exposed/unexposed.

Zf is the paper emulsion distance behind the holder front datum. All holders and the focusing back must share it. The 3 mm focusing acrylic is removable; shim its lens-facing matte surface to Zf. Focus with the focusing back, replace it with a loaded holder, withdraw the slide for exposure, replace the slide, then remove the holder. Transfer the sheet into your existing processing-tank slot in a changing bag. Do not immerse the holder.

## 2 — Frames
The rear locating frame derives from holder size and fitting clearance hf. Its light opening is larger than the image mask; the holder mask sets exposure dimensions. Rear side guides are laminated to the holder depth; labels specify repeat count. Fit retaining clips at the indicated screw positions, with compliant pressure and light seals. The front lensboard has an independently specified mounting hole; measure the actual lens flange, never infer it from focal length.

Harlin Figure 1 notation: A/B are rear/front widths used by Top/Bottom patterns, measured across the frame faces being covered; C/D are rear/front internal heights used by Side patterns. They are not four interchangeable internal-opening dimensions. The application displays both inner openings and derived A/B/C/D.

Each lower frame foot captures a 1/4-20 UNC metal hex nut: a round-hole bottom layer, two hex-pocket layers and a top cap. Set measured nut across-flats af, thickness nt and pocket allowance nc. Twin tabs join each foot to its upright. Test nut retention and bolt length. Do not tap tripod threads directly into 3 mm sheet. Rail and tripod are reference shapes only.

## 3 — Bellows
Outer is thin, flexible and fully opaque. Ribs are thin card stiffeners. Liner is thin matte black fabric to suppress reflections; it need not be the primary light barrier.

E is maximum axial separation of bellows attachment faces. Thin-lens planning uses v=fu/(u−f), with v≈f at infinity, then subtracts the front principal-plane offset and rear attachment-to-paper offset. Actual principal planes must be measured. The estimate never silently overwrites E. The 3D lens is a schematic, not an optical prescription.

Pattern length L=E×(1+e), with 15% default reserve. This follows the tutorial's empirical extra length, not the other website's Bf. FW is Harlin's repeating layout spacing; N=ceil(L/FW), actual spacing=L/N. Each repeat has two faces: both N repeats and 2N faces are shown.

The corner construction uses a right-angle triangle rotated with the tapered corner line. Intersections create alternating wide/narrow faces. Corner nodes from the reference Side taper are projected to Top/Bottom patterns. Rectangular tapers require separate Side and Top/Bottom rib widths. Output has four independent panel templates with registration lines and seam tabs: this separate-panel joining method is an adaptation for cutting layouts, not a reproduction of Harlin's continuous outer wrap.

Rib gap is centered on each hinge line; ribs are polygon-inset from hinge and corner lines. The initial check compares gap with twice the total outer+rib+liner+estimated adhesive thickness. Real assemblies may require more. Excessive gap can remove a narrow rib and blocks export. Seam tabs and end attachment allowances are separate settings. Outer and liner seam allowances can differ; stagger seams and avoid stacked corner overlaps. To use a continuous wrap and diagonal seam as in the original tutorial, transfer the panel registration patterns manually and create the wrap allowance separately.

Minimum extension Emin and the extension slider describe the assembled pose, not a cloth collision simulation. Estimated stack depth is 2N times laminate thickness, excluding corner/seam accumulation and compression; it is not a guaranteed minimum length. Make a 1:1 paper model and a short real-material fold sample.

## Fabrication sequence
1. Measure actual board, paper, slide and nut; cut fitting coupons first.
2. Build one holder/rear-frame pair. Test slide operation, paper flatness, back closure and seals.
3. Calibrate the focusing surface to the paper emulsion datum using shims.
4. Print/cut a full-size paper model. Verify the 50 mm scale and match both frames before folding.
5. Cut and number ribs. Test adhesive on scraps for opacity, flexibility and adhesion.
6. Glue ribs on registration marks, leaving hinges free; apply liner with staggered seams. Follow the current adhesive manufacturer's ventilation, application and cure instructions.
7. After curing, fold gently, train under suitable light pressure, then attach the frames.
8. In a dark room use a low-heat battery light to inspect holder mouth, joints and bellows. Follow with a sacrificial-paper daylight fog test. Avoid hot lights in an enclosed camera.
9. Verify focus and vignetting before making additional holders.

## DXF/SVG
Final tab exports 01_holder, 02_frames and 03_bellows at nominal 1:1 mm. DXF is ASCII R12 using LINE, CIRCLE, POLYLINE and TEXT; select millimeters on import (legacy importers may ignore unit metadata). SVG explicitly declares millimeters. Both use the same 2D geometry that drives the previews.

Only CUT is intended for cutting. FOLD_M/FOLD_V are hinge guides; GUIDE, LABEL and CALIBRATION are non-cutting. Material/thickness labels are ASCII for legacy DXF compatibility. Separate thickness groups before nesting. This is a labeled layout, not automatic stock optimization.

No automatic kerf offset is applied in v0.1. The kerf field drives fitting coupons only; apply compensation once in CAM. Inspect closed contours, scale, holes and quantities before machining. Check laser suitability of all coatings, fabrics and adhesives with their suppliers; bellows templates can instead be printed and hand-cut.

## Version and limits
File: bellows_camera v0.1.html; revisions follow 0.11, 0.12, etc. Storage uses a stable application key. No structural analysis, actual-lens ray tracing, fabric collision solution or light-tightness certification is provided. A real locking support rail is required but is outside this cutting set.

## References
- J. B. Harlin (2008), *Bellows Construction: A Basic Tutorial Detailing the Design and Construction of Your Own Large Format Camera Bellows*. [Original PDF](https://www.jbhphoto.com/wp-content/uploads/2015/01/bbuildingjbh2008.pdf)
- [J. B. & Susan Harlin](https://www.jbhphoto.com/)

Terminology, model-first workflow, ribbed laminate and right-angle corner construction reference the tutorial. Text, graphics and code are independently authored. Holder interfaces, separate-panel templates, validation and UI are new adaptations; no endorsement is implied. Original-document copyright remains with its rights holders.
