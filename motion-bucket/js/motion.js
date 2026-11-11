// Motion math: springs, cubic beziers, CSS easing strings, feel labels and code generation.

export const CURVES = {
  ios: {
    easeInOut: { label: 'Ease in-out', p: [0.42, 0, 0.58, 1], swift: '.easeInOut' },
    easeOut: { label: 'Ease out', p: [0, 0, 0.58, 1], swift: '.easeOut' },
    easeIn: { label: 'Ease in', p: [0.42, 0, 1, 1], swift: '.easeIn' },
    linear: { label: 'Linear', p: [0, 0, 1, 1], swift: '.linear' },
  },
  android: {
    emphasized: { label: 'Emphasized', p: [0.2, 0, 0, 1] },
    emphasizedDecelerate: { label: 'Emphasized decelerate', p: [0.05, 0.7, 0.1, 1] },
    emphasizedAccelerate: { label: 'Emphasized accelerate', p: [0.3, 0, 0.8, 0.15] },
    standard: { label: 'Standard', p: [0.2, 0, 0, 1] },
    standardDecelerate: { label: 'Standard decelerate', p: [0, 0, 0, 1] },
    standardAccelerate: { label: 'Standard accelerate', p: [0.3, 0, 1, 1] },
    legacy: { label: 'Legacy (fast out, slow in)', p: [0.4, 0, 0.2, 1] },
    linear: { label: 'Linear', p: [0, 0, 1, 1] },
  },
};

export function curveOf(os, name) {
  return CURVES[os][name] || CURVES.ios[name] || CURVES.android[name] || CURVES.ios.easeInOut;
}

/* ---------- springs ---------- */

// Position (0 to 1) of a unit-mass spring released from 0 toward 1, with normalised initial velocity v0.
export function springAt(k, z, v0 = 0) {
  const w0 = Math.sqrt(k);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    const B = (v0 - z * w0) / wd;
    return (t) => 1 + Math.exp(-z * w0 * t) * (-Math.cos(wd * t) + B * Math.sin(wd * t));
  }
  if (z === 1) {
    const B = v0 - w0;
    return (t) => 1 + Math.exp(-w0 * t) * (-1 + B * t);
  }
  const s = Math.sqrt(z * z - 1);
  const r1 = -w0 * (z - s), r2 = -w0 * (z + s);
  const C2 = (v0 + r1) / (r2 - r1), C1 = -1 - C2;
  return (t) => 1 + C1 * Math.exp(r1 * t) + C2 * Math.exp(r2 * t);
}

// Seconds until the spring stays within 0.2% of its target (well under a pixel on a phone).
export function settleTime(k, z, v0 = 0) {
  const f = springAt(k, z, v0);
  let last = 0;
  for (let t = 0; t <= 6; t += 1 / 240) if (Math.abs(1 - f(t)) > 0.002) last = t;
  return Math.max(0.06, last + 1 / 240);
}

// Displacement of an impulse (start and end at rest position, kicked with velocity). Peak normalised to 1.
export function impulseAt(k, z) {
  const w0 = Math.sqrt(k);
  const zz = Math.min(z, 0.95);
  const wd = w0 * Math.sqrt(1 - zz * zz);
  const raw = (t) => Math.exp(-zz * w0 * t) * Math.sin(wd * t);
  let peak = 0;
  for (let t = 0; t < 1; t += 1 / 500) peak = Math.max(peak, Math.abs(raw(t)));
  return (t) => raw(t) / (peak || 1);
}

export const responseOf = (k) => (2 * Math.PI) / Math.sqrt(k);
export const stiffnessOf = (response) => Math.pow((2 * Math.PI) / response, 2);

/* ---------- particles ---------- */

// Position of a particle launched with velocity (vx, vy) in px/s, y pointing up, under gravity g (px/s², pulls down)
// and air drag c (per second, velocity decays as e^-ct). Returns t (s) -> [x, y].
export function ballistic(vx, vy, g, c) {
  if (c < 1e-3) return (t) => [vx * t, vy * t - 0.5 * g * t * t];
  return (t) => {
    const e = (1 - Math.exp(-c * t)) / c;
    return [vx * e, (vy + g / c) * e - (g / c) * t];
  };
}

// Apex height (px) and time to apex (s) of the lead particle of a burst spec.
export function apexOf(spec) {
  const vy = Math.sin(((spec.angle ?? 90) * Math.PI) / 180) * spec.speed;
  if (vy <= 0 || spec.gravity <= 0) return null;
  const c = spec.drag, g = spec.gravity;
  const t = c < 1e-3 ? vy / g : Math.log(1 + (c * vy) / g) / c;
  return { t, h: ballistic(0, vy, g, c)(t)[1] };
}

/* ---------- cubic bezier ---------- */

export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (x > v) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

/* ---------- resolve a spec into something playable ---------- */

const linearOK = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)');

function linearString(fn, durMs) {
  const n = Math.min(160, Math.max(28, Math.round((durMs / 1000) * 100)));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(i === n ? 1 : +fn(i / n).toFixed(4));
  return `linear(${pts.join(', ')})`;
}

const cache = new Map();

// spec: { type: 'spring', k, z }, { type: 'tween', ms, curve } or
// { type: 'burst', speed, gravity, drag, life, spread, count, angle } for particles.
export function resolve(spec, os = 'ios', v0 = 0) {
  const key = JSON.stringify([spec, os, +v0.toFixed(2)]);
  if (cache.has(key)) return cache.get(key);
  let out;
  if (spec.type === 'spring') {
    const secs = settleTime(spec.k, spec.z, v0);
    const f = springAt(spec.k, spec.z, v0);
    const ease = (p) => (p >= 1 ? 1 : f(p * secs));
    const ms = Math.round(secs * 1000);
    out = { type: 'spring', ms, ease, easing: linearOK ? linearString(ease, ms) : 'cubic-bezier(0.2, 0.9, 0.3, 1.1)' };
  } else if (spec.type === 'burst') {
    // The curve is the height of the lead particle over its life, scaled so the furthest point is 1.
    const a = ((spec.angle ?? 90) * Math.PI) / 180;
    const f = ballistic(0, Math.sin(a) * spec.speed, spec.gravity, spec.drag);
    const secs = spec.life / 1000;
    let far = 0;
    for (let i = 0; i <= 120; i++) far = Math.max(far, Math.abs(f((i / 120) * secs)[1]));
    const ease = (p) => f(p * secs)[1] / (far || 1);
    out = { type: 'burst', ms: spec.life, ease, easing: 'linear' };
  } else {
    const c = curveOf(os, spec.curve);
    const ease = bezier(...c.p);
    out = { type: 'tween', ms: spec.ms, ease, easing: `cubic-bezier(${c.p.join(', ')})`, curve: c };
  }
  if (cache.size > 400) cache.clear();
  cache.set(key, out);
  return out;
}

/* ---------- character ---------- */

export function character(spec, ms) {
  if (spec.type === 'burst') {
    const up = Math.sin(((spec.angle ?? 90) * Math.PI) / 180) * spec.speed;
    if (spec.gravity < 0) return { word: 'Floaty', energy: 2 };
    if (up < 0) return { word: 'Drifting', energy: 2 };
    if (spec.speed >= 1300) return { word: 'Explosive', energy: 5 };
    if (spec.drag >= 2.6) return { word: 'Fluttery', energy: 3 };
    return { word: 'Festive', energy: 4 };
  }
  if (spec.type === 'spring') {
    if (spec.z < 0.5) return { word: 'Bouncy', energy: 5 };
    if (spec.z < 0.78) return { word: 'Springy', energy: 4 };
    const r = responseOf(spec.k);
    if (r < 0.3) return { word: 'Snappy', energy: 4 };
    if (r < 0.52) return { word: 'Smooth', energy: 3 };
    return { word: 'Relaxed', energy: 2 };
  }
  if (ms <= 130) return { word: 'Instant', energy: 5 };
  if (ms <= 230) return { word: 'Quick', energy: 4 };
  if (ms <= 360) return { word: 'Smooth', energy: 3 };
  if (ms <= 520) return { word: 'Measured', energy: 2 };
  return { word: 'Slow', energy: 1 };
}

/* ---------- code generation ---------- */

const f2 = (n) => (+n.toFixed(2)).toString();
const f3 = (n) => (+n.toFixed(3)).toString();

const PROPS = {
  translateY: { what: 'offset', swift: '.offset(y: isOn ? 0 : 320)', uikit: 'view.transform = isOn ? .identity : CGAffineTransform(translationX: 0, y: 320)', composeVal: 'animateDpAsState(if (isOn) 0.dp else 320.dp', composeUse: 'Modifier.offset { IntOffset(0, value.roundToPx()) }', viewProp: 'translationY(if (isOn) 0f else 320f)', springProp: 'DynamicAnimation.TRANSLATION_Y', css: 'transform' },
  translateX: { what: 'offset', swift: '.offset(x: isOn ? 0 : 390)', uikit: 'view.transform = isOn ? .identity : CGAffineTransform(translationX: 390, y: 0)', composeVal: 'animateDpAsState(if (isOn) 0.dp else 390.dp', composeUse: 'Modifier.offset { IntOffset(value.roundToPx(), 0) }', viewProp: 'translationX(if (isOn) 0f else 390f)', springProp: 'DynamicAnimation.TRANSLATION_X', css: 'transform' },
  scale: { what: 'scale', swift: '.scaleEffect(isOn ? 1 : 0.9)', uikit: 'view.transform = isOn ? .identity : CGAffineTransform(scaleX: 0.9, y: 0.9)', composeVal: 'animateFloatAsState(if (isOn) 1f else 0.9f', composeUse: 'Modifier.graphicsLayer { scaleX = value; scaleY = value }', viewProp: 'scaleX(if (isOn) 1f else 0.9f).scaleY(if (isOn) 1f else 0.9f)', springProp: 'DynamicAnimation.SCALE_X', css: 'transform' },
  opacity: { what: 'opacity', swift: '.opacity(isOn ? 1 : 0)', uikit: 'view.alpha = isOn ? 1 : 0', composeVal: 'animateFloatAsState(if (isOn) 1f else 0f', composeUse: 'Modifier.graphicsLayer { alpha = value }', viewProp: 'alpha(if (isOn) 1f else 0f)', springProp: 'DynamicAnimation.ALPHA', css: 'opacity' },
  rotateY: { what: 'rotation', swift: '.rotation3DEffect(.degrees(isOn ? 180 : 0), axis: (x: 0, y: 1, z: 0))', uikit: 'view.layer.transform = CATransform3DMakeRotation(isOn ? .pi : 0, 0, 1, 0)', composeVal: 'animateFloatAsState(if (isOn) 180f else 0f', composeUse: 'Modifier.graphicsLayer { rotationY = value; cameraDistance = 12f * density }', viewProp: 'rotationY(if (isOn) 180f else 0f)', springProp: 'DynamicAnimation.ROTATION_Y', css: 'transform' },
  rotate: { what: 'rotation', swift: '.rotationEffect(.degrees(isOn ? 0 : 45))', uikit: 'view.transform = CGAffineTransform(rotationAngle: isOn ? 0 : .pi / 4)', composeVal: 'animateFloatAsState(if (isOn) 0f else 45f', composeUse: 'Modifier.graphicsLayer { rotationZ = value }', viewProp: 'rotation(if (isOn) 0f else 45f)', springProp: 'DynamicAnimation.ROTATION', css: 'transform' },
  height: { custom: (v) => `view.updateLayoutParams { height = ${v}.toInt() }`, what: 'height', swift: '.frame(height: isOn ? nil : 0).clipped()', uikit: 'heightConstraint.constant = isOn ? expandedHeight : 0\nview.superview?.layoutIfNeeded()', composeVal: 'animateDpAsState(if (isOn) 120.dp else 0.dp', composeUse: 'Modifier.height(value).clipToBounds()', viewProp: 'translationY(0f) // animate a ValueAnimator on layoutParams.height', springProp: 'DynamicAnimation.SCALE_Y', css: 'grid-template-rows' },
  width: { custom: (v) => `view.updateLayoutParams { width = ${v}.toInt() }`, what: 'width', swift: '.frame(width: isOn ? 56 : 240)', uikit: 'widthConstraint.constant = isOn ? 56 : 240\nview.superview?.layoutIfNeeded()', composeVal: 'animateDpAsState(if (isOn) 56.dp else 240.dp', composeUse: 'Modifier.width(value)', viewProp: 'scaleX(if (isOn) 0.25f else 1f)', springProp: 'DynamicAnimation.SCALE_X', css: 'width' },
  blur: { custom: (v) => `view.setRenderEffect(RenderEffect.createBlurEffect(${v}, ${v}, Shader.TileMode.CLAMP))`, what: 'blur', swift: '.blur(radius: isOn ? 12 : 0)', uikit: 'blurAnimator.fractionComplete = isOn ? 1 : 0 // UIVisualEffectView', composeVal: 'animateDpAsState(if (isOn) 12.dp else 0.dp', composeUse: 'Modifier.blur(value)', viewProp: 'alpha(1f) // RenderEffect.createBlurEffect on API 31+', springProp: 'DynamicAnimation.ALPHA', css: 'filter' },
  elevation: { what: 'shadow', swift: '.shadow(color: .black.opacity(0.18), radius: isOn ? 16 : 2, y: isOn ? 8 : 1)', uikit: 'view.layer.shadowRadius = isOn ? 16 : 2', composeVal: 'animateDpAsState(if (isOn) 6.dp else 1.dp', composeUse: 'Modifier.shadow(value, shape)', viewProp: 'translationZ(if (isOn) 6f else 0f)', springProp: 'DynamicAnimation.TRANSLATION_Z', css: 'box-shadow' },
  scroll: { custom: (v) => `scrollView.scrollTo(0, ${v}.toInt())`, composeFull: (spec1) => `// ${'${api}'}\nval scope = rememberCoroutineScope()\n\nscope.launch {\n    listState.animateScrollBy(\n        value = -currentOffsetPx,\n        animationSpec = ${spec1}\n    )\n}`, what: 'scroll position', swift: 'proxy.scrollTo(topID, anchor: .top)', uikit: 'scrollView.setContentOffset(.zero, animated: true)', composeVal: 'listState.animateScrollToItem(0', composeUse: '// LazyColumn(state = listState)', viewProp: 'scrollY(0) // or recyclerView.smoothScrollToPosition(0)', springProp: 'DynamicAnimation.SCROLL_Y', css: 'scroll-behavior' },
};

const CONFETTI = ['0xFF4F00', '0xFFB800', '0x2EC4B6', '0x7A5CFA', '0xFF4D8D'];

function burstCode(s, os, api) {
  const life = (s.life / 1000).toFixed(1);
  const perFrame = Math.exp(-s.drag / 60).toFixed(3);
  const tabs = [];
  if (os === 'ios') {
    const uikit = `// ${api}
// Core Animation has no air drag, so lifetime and velocityRange stand in for it.
func makeConfetti(in bounds: CGRect) -> CAEmitterLayer {
    let emitter = CAEmitterLayer()
    emitter.emitterPosition = CGPoint(x: bounds.midX, y: bounds.maxY * 0.7)
    emitter.emitterShape = .point

    let colors: [UIColor] = [.systemOrange, .systemYellow, .systemTeal, .systemPurple, .systemPink]
    emitter.emitterCells = colors.map { color in
        let cell = CAEmitterCell()
        cell.contents = UIImage(named: "confetti-piece")?.cgImage
        cell.color = color.cgColor
        cell.birthRate = ${Math.round((s.count * 10) / 5)}        // ${s.count} pieces over 5 colours in a 0.1 s pulse
        cell.lifetime = ${life}
        cell.velocity = ${Math.round(s.speed)}
        cell.velocityRange = ${Math.round(s.speed * 0.45)}
        cell.emissionLongitude = ${((-(s.angle ?? 90) * Math.PI) / 180).toFixed(3)}   // ${s.angle ?? 90}° from the right
        cell.emissionRange = ${((s.spread * Math.PI) / 180).toFixed(3)}
        cell.yAcceleration = ${Math.round(s.gravity)}
        cell.spin = 4
        cell.spinRange = 8
        cell.scale = 0.5
        cell.scaleRange = 0.25
        return cell
    }

    // Emit once, then stop.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { emitter.birthRate = 0 }
    return emitter
}`;
    const swiftui = `// ${api}
struct ConfettiView: UIViewRepresentable {
    var trigger: Int

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.isUserInteractionEnabled = false
        return view
    }

    func updateUIView(_ view: UIView, context: Context) {
        guard trigger > 0 else { return }
        let emitter = makeConfetti(in: view.bounds)   // from the UIKit tab
        view.layer.addSublayer(emitter)
        DispatchQueue.main.asyncAfter(deadline: .now() + ${life}) {
            emitter.removeFromSuperlayer()
        }
    }
}

// Usage
content
    .overlay { ConfettiView(trigger: celebrations) }
    .sensoryFeedback(.success, trigger: celebrations)`;
    tabs.push({ id: 'swiftui', label: 'SwiftUI', code: swiftui }, { id: 'uikit', label: 'UIKit', code: uikit });
  } else {
    const party = `Party(
    angle = ${Math.round((360 - (s.angle ?? 90)) % 360)},              // clockwise from the right
    spread = ${Math.round(s.spread)},
    speed = ${Math.round(s.speed / 80)}f,
    maxSpeed = ${Math.round(s.speed / 40)}f,          // per frame, roughly px/s ÷ 40
    damping = ${perFrame}f,         // velocity kept each frame
    timeToLive = ${s.life}L,
    colors = listOf(${CONFETTI.join(', ')}),
    position = Position.Relative(0.5, 0.7),
    emitter = Emitter(duration = 100, TimeUnit.MILLISECONDS).max(${s.count})
)`;
    tabs.push({ id: 'compose', label: 'Compose', code: `// ${api}\n// implementation("nl.dionsegijn:konfetti-compose:2.0.4")\nval party = ${party}\n\nKonfettiView(\n    modifier = Modifier.fillMaxSize(),\n    parties = listOf(party)\n)` });
    tabs.push({ id: 'views', label: 'Views', code: `// implementation("nl.dionsegijn:konfetti-xml:2.0.4")\n// <nl.dionsegijn.konfetti.xml.KonfettiView android:id="@+id/konfetti" ... />\nval party = ${party}\n\nbinding.konfetti.start(party)` });
  }
  tabs.push({ id: 'css', label: 'Web', code: `// npm install canvas-confetti
import confetti from 'canvas-confetti';

confetti({
  particleCount: ${s.count},
  angle: ${s.angle ?? 90},
  spread: ${s.spread},
  startVelocity: ${Math.round(s.speed / 26)},   // px per frame at 60 fps
  decay: ${perFrame},          // velocity kept each frame
  gravity: ${(s.gravity / 1400).toFixed(2)},
  ticks: ${Math.round(s.life / 16.67)},              // frames before pieces fade
  origin: { x: 0.5, y: 0.7 },
  disableForReducedMotion: true
});` });
  tabs.push({ id: 'tokens', label: 'Tokens', code: JSON.stringify({ platform: os, property: 'particles', motion: { type: 'burst', launchSpeed: s.speed, gravity: s.gravity, drag: s.drag, lifeMs: s.life, spreadDeg: s.spread, angleDeg: s.angle ?? 90, pieces: s.count } }, null, 2) });
  return tabs;
}

export function code(spec, os, prop, api) {
  if (spec.type === 'burst') return burstCode(spec, os, api);
  const P = PROPS[prop] || PROPS.translateY;
  const r = resolve(spec, os);
  const tabs = [];
  if (os === 'ios') {
    let swiftAnim, uikit;
    if (spec.type === 'spring') {
      const resp = responseOf(spec.k), damping = 2 * spec.z * Math.sqrt(spec.k);
      swiftAnim = `.spring(response: ${f2(resp)}, dampingFraction: ${f2(spec.z)})`;
      uikit = `let timing = UISpringTimingParameters(\n    mass: 1,\n    stiffness: ${f2(spec.k)},\n    damping: ${f2(damping)},\n    initialVelocity: .zero\n)\nlet animator = UIViewPropertyAnimator(duration: 0, timingParameters: timing)\nanimator.addAnimations {\n    ${P.uikit.replace(/\n/g, '\n    ')}\n}\nanimator.startAnimation()`;
      swiftAnim += `\n// same curve: .interpolatingSpring(stiffness: ${f2(spec.k)}, damping: ${f2(damping)})`;
    } else {
      const [a, b, c, d] = r.curve.p;
      const s = (spec.ms / 1000).toFixed(2);
      swiftAnim = r.curve.swift ? `${r.curve.swift}(duration: ${s})` : `.timingCurve(${a}, ${b}, ${c}, ${d}, duration: ${s})`;
      uikit = `let animator = UIViewPropertyAnimator(\n    duration: ${s},\n    controlPoint1: CGPoint(x: ${a}, y: ${b}),\n    controlPoint2: CGPoint(x: ${c}, y: ${d})\n) {\n    ${P.uikit.replace(/\n/g, '\n    ')}\n}\nanimator.startAnimation()`;
    }
    const lines = swiftAnim.split('\n');
    tabs.push({ id: 'swiftui', label: 'SwiftUI', code: `// ${api}\n@State private var isOn = false\n\nview\n    ${P.swift}\n    .animation(${lines[0]}, value: isOn)${lines[1] ? '\n' + lines[1] : ''}` });
    tabs.push({ id: 'uikit', label: 'UIKit', code: uikit });
  } else {
    let spec1, views;
    if (spec.type === 'spring') {
      spec1 = `spring(\n        dampingRatio = ${f2(spec.z)}f,\n        stiffness = ${f2(spec.k)}f\n    )`;
      views = P.custom
        ? `SpringAnimation(FloatValueHolder(from)).apply {\n    spring = SpringForce(to).apply {\n        stiffness = ${f2(spec.k)}f\n        dampingRatio = ${f2(spec.z)}f\n    }\n    addUpdateListener { _, value, _ ->\n        ${P.custom('value')}\n    }\n    start()\n}`
        : `SpringAnimation(view, ${P.springProp}).apply {\n    spring = SpringForce(/* final position */ 0f).apply {\n        stiffness = ${f2(spec.k)}f\n        dampingRatio = ${f2(spec.z)}f\n    }\n    start()\n}`;
    } else {
      const [a, b, c, d] = r.curve.p;
      spec1 = `tween(\n        durationMillis = ${spec.ms},\n        easing = CubicBezierEasing(${a}f, ${b}f, ${c}f, ${d}f)\n    )`;
      views = P.custom
        ? `ValueAnimator.ofFloat(from, to).apply {\n    duration = ${spec.ms}\n    interpolator = PathInterpolator(${a}f, ${b}f, ${c}f, ${d}f)\n    addUpdateListener {\n        ${P.custom('(it.animatedValue as Float)')}\n    }\n    start()\n}`
        : `view.animate()\n    .${P.viewProp}\n    .setDuration(${spec.ms})\n    .setInterpolator(PathInterpolator(${a}f, ${b}f, ${c}f, ${d}f))\n    .start()`;
    }
    const compose = P.composeFull
      ? P.composeFull(spec1.replace(/\n    /g, '\n        ')).replace('${api}', api)
      : `// ${api}\nval value by ${P.composeVal},\n    animationSpec = ${spec1},\n    label = "${P.what}"\n)\n\n${P.composeUse}`;
    tabs.push({ id: 'compose', label: 'Compose', code: compose });
    tabs.push({ id: 'views', label: 'Views', code: views });
  }
  tabs.push({ id: 'css', label: 'CSS', code: `:root {\n  --motion-duration: ${r.ms}ms;\n  --motion-easing: ${r.easing};\n}\n\n.element {\n  transition: ${P.css} var(--motion-duration) var(--motion-easing);\n}` });
  const tok = spec.type === 'spring'
    ? { type: 'spring', stiffness: +f2(spec.k), dampingRatio: +f2(spec.z), mass: 1, response: +f3(responseOf(spec.k)), settleMs: r.ms }
    : { type: 'curve', durationMs: spec.ms, curve: r.curve.label, cubicBezier: r.curve.p };
  tabs.push({ id: 'tokens', label: 'Tokens', code: JSON.stringify({ platform: os, property: prop, motion: tok }, null, 2) });
  return tabs;
}
