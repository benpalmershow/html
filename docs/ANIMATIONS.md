# Animation System Documentation

## Overview
The Howdy, Stranger website now features a comprehensive micro-animation system powered by Motion One library.

## Features Implemented

### 1. **Logo Entrance Animation**
- Smooth bounce effect with scale and blur transitions
- Custom easing: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Duration: 1.2s

### 2. **Card Hover Micro-Animations**
- Lift effect on hover (translateY: -4px, scale: 1.02)
- Enhanced shadow and border color transitions
- Applied to: `.card`, `.announcement-card`, `.audio-card`

### 3. **Icon Animations**
- Staggered entrance with rotation effect
- All Lucide icons animate on page load
- Delay: 50ms per icon

### 4. **Subtitle Reveal**
- Fade in from bottom with delayed entrance
- Coordinates with logo animation

### 5. **Enhanced Loading States**
- Dual-layer shimmer effect
- Smooth gradient animation
- Optimized for performance

### 6. **Navigation Link Micro-Interactions**
- Subtle lift on hover (translateY: -2px)
- Quick 200ms transitions

## Configuration

All animations are centralized in `/js/motion-system.js`. To customize:

```javascript
MotionSystem.presets.logoEntrance = {
  initial: { opacity: 0, scale: 0.8, filter: 'blur(10px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  transition: { duration: 1.2, easing: [0.34, 1.56, 0.64, 1] }
}
```

## Performance

- Uses `will-change` CSS property for optimized transforms
- Leverages GPU acceleration via `transform` and `opacity`
- Intersection Observer for scroll-based animations
- Graceful degradation for reduced motion preferences

## Browser Support

- Modern browsers with Motion One support
- Fallback to CSS transitions for older browsers
- `prefers-reduced-motion` respected

## Future Enhancements

- [ ] Rive interactive components
- [ ] Page transition animations
- [ ] Scroll-triggered parallax effects
- [ ] Custom cursor animations
- [ ] 3D logo variants (Blender/WebGL)

## Design Tools Integration

- **Jitter**: Export JSON animations for web
- **Rive**: Interactive state machines (planned)
- **After Effects**: Lottie export compatibility
- **Blender**: GLTF/WebGL 3D models
- **Figma**: Design tokens & component variants
