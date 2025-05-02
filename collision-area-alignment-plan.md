# Collision Area Alignment Plan

## Problem Statement

The collision areas (hitboxes) for game objects are misaligned with their visual sprites. Currently, the visual sprite appears in the bottom-right corner of its collision area, making gameplay unintuitive as players need to aim at empty space instead of directly at the visible objects.

```
CCC  <-- Collision Area (C)
CCC
CCC
---OOO  <-- Visual Object (O)
---OOO
---OOO
```

Players need to aim at the invisible collision area to the left of objects to register a hit, rather than aiming at the visible sprite.

## Root Cause Analysis

Based on the code review, the issue stems from how collision areas are defined in Phaser without specifying proper offsets. When using `setCircle()` or similar methods, Phaser centers the collision shape around the sprite's origin point. If the origin is not adjusted, misalignment occurs.

Key findings:
- Enemies use `setCircle()` in the `EnemyEntity` class without proper offsets
- Player sprite uses `setCircle()` in `GameSceneInitializer` without proper offsets
- Projectile collision shapes are created in `ProjectileEventHandler` without alignment considerations
- Powerups likely have the same issue

## Solution Approaches

There are three potential approaches:

1. **Adjust collision area offsets** - Keep the sprites as they are but modify collision area positioning
2. **Adjust sprite anchor points** - Change where sprites are anchored relative to their collision areas
3. **Combination approach** - Adjust both collision areas and sprite positioning for perfect alignment

Recommendation: Use approach #1 (adjust collision area offsets) as it's most direct and least likely to affect other gameplay systems.

## Implementation Plan

### 1. Diagnostic Phase

First, implement a diagnostic visualization to confirm the exact misalignment:

```javascript
// Add this to a debug mode to visualize hitboxes
function visualizeHitboxes(scene) {
  scene.physics.world.createDebugGraphic();
}
```

This will help verify our understanding of the misalignment and provide visual feedback during fixes.

### 2. Modify Enemy Entity Collision Areas

In `EnemyEntity.ts`, update the collision circle setup with proper offsets:

```typescript
// Current implementation (line ~95):
this.setCircle(config.collisionRadius);

// Updated implementation:
this.setCircle(
  config.collisionRadius,
  -config.collisionRadius + this.width/2,  // X offset to center collision
  -config.collisionRadius + this.height/2  // Y offset to center collision
);
```

This adjusts the collision circle to be centered on the sprite rather than having the sprite in its bottom-right corner.

### 3. Update Player Collision Area

Similarly in `GameSceneInitializer.ts`, update the player's collision circle:

```typescript
// Current implementation (line ~75):
this.gameObjects.playerSprite.setCircle(10);

// Updated implementation:
this.gameObjects.playerSprite.setCircle(
  10,
  -10 + this.gameObjects.playerSprite.width/2,
  -10 + this.gameObjects.playerSprite.height/2
);
```

### 4. Adjust Projectile Collision Shapes

In `ProjectileEventHandler.ts`, update how projectile collision shapes are created:

```typescript
// For bullet/circle projectiles (around line ~118-123)
if (isBullet || data.visualShape === 'ellipse') {
  // Current implementation:
  const radius = Math.max(data.visualWidth, data.visualHeight) / 2;
  body.setCircle(radius);
  
  // Updated implementation:
  const radius = Math.max(data.visualWidth, data.visualHeight) / 2;
  body.setCircle(
    radius,
    -radius + projectileShape.width/2,
    -radius + projectileShape.height/2
  );
}
```

### 5. Update Powerup Collision Areas

Ensure powerups also have properly aligned collision areas. This would be in the code that initializes powerup sprites.

## Testing Strategy

1. **Visual Testing**: Enable hitbox visualization in debug mode to confirm alignment
2. **Gameplay Testing**: Verify that players can hit enemies by aiming directly at the visible sprites
3. **Edge Case Testing**: Test with different enemy types and projectiles to ensure consistent behavior
4. **Performance Check**: Verify no performance impact from collision area changes

## Implementation Timeline

1. Add hitbox visualization and diagnostic code (2 hours)
2. Implement collision area adjustments for enemies (3 hours)
3. Implement collision area adjustments for player and projectiles (2 hours)
4. Testing and refinement (3 hours)
5. Documentation and code cleanup (1 hour)

## Potential Challenges

1. **Different Entity Sizes**: Various enemy types may require different offset calculations
2. **Animation Considerations**: If sprites use animations, ensure collision areas remain properly aligned
3. **Performance Impact**: Monitor for any performance changes when adjusting numerous collision areas

## Success Criteria

1. Players can hit enemies by aiming directly at the visible sprites
2. No regression in collision detection for player-enemy interactions
3. Consistent behavior across all game objects (enemies, powerups, projectiles)
4. No negative impact on game performance

## Next Steps

After review and approval of this plan:

1. Create a new branch for this feature
2. Implement diagnostic visualization
3. Make the collision area adjustments in order of priority
4. Test thoroughly before merging

## Alternative Solution: Origin Point Adjustment

If the offset approach proves challenging, an alternative is to adjust the origin points of sprites:

```typescript
// Example for player sprite:
this.gameObjects.playerSprite.setOrigin(0.5, 0.5); // Center origin
```

This would require careful consideration of how it might affect other aspects of the game.