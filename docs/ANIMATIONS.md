# Animation System Documentation

## Overview
The Howdy, Stranger website features a custom micro-animation system implemented in vanilla JavaScript.

## Features Implemented

### 1. **Logo Entrance Animation**
- Smooth bounce effect with scale, rotation, and blur transitions
- Custom cubic-bezier easing
- Duration: 1.5s

### 2. **Card Hover Micro-Animations**
- Lift effect on hover (translateY: -4px, scale: 1.02)
- Enhanced shadow and border color transitions
- Applied to: `.card`, `.announcement-card`, `.audio-card`

### 3. **Icon Animations**
- Selective icon animations for hint steps
- Scale and rotation effects on hover
- Respects `prefers-reduced-motion` setting

### 4. **Subtitle Reveal**
- Word-by-word reveal with staggered timing
- Fade in from bottom with scale effect
- Coordinates with logo animation

### 5. **Parallax Scroll**
- Logo movement on hero section scroll
- Performance optimized with reduced motion support

### 6. **Custom Cursor Interactions**
- Pointer cursor for interactive elements
- Touch device detection to avoid unnecessary processing

## Configuration

All animations are centralized in `/js/animations.js`. Key functions:

- `animateLogo()` - Logo entrance animation
- `animateSubtitle()` - Word-by-word subtitle reveal
- `initParallax()` - Parallax scroll effects
- `initCustomCursor()` - Custom cursor interactions
- `initIconAnimations()` - Icon hover effects

To customize timing or effects, modify the CSS transitions and transforms within these functions.

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
