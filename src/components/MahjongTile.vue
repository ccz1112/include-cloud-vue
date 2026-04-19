<template>
  <div
    class="mahjong-tile"
    :class="[
      `variant-${variant}`,
      `accent-${tileData.suitClass}`,
      {
        back,
        vertical,
        selected,
        disabled,
        interactive: clickable && !disabled
      }
    ]"
  >
    <template v-if="!back">
      <div class="tile-gloss"></div>
      <div v-if="showCorners" class="tile-corner top">
        <span class="corner-rank">{{ tileData.numChar }}</span>
        <span v-if="tileData.suit" class="corner-suit">{{ tileData.suit }}</span>
      </div>
      <div class="tile-center" :class="{ 'small-center': variant === 'small' }">
        <span class="tile-glyph">{{ tileData.glyph || tileData.numChar }}</span>
      </div>
      <div v-if="showLabel" class="tile-label">{{ tileData.tileLabel || tileData.shortLabel }}</div>
      <div v-if="showCorners" class="tile-corner bottom" aria-hidden="true">
        <span class="corner-rank">{{ tileData.numChar }}</span>
        <span v-if="tileData.suit" class="corner-suit">{{ tileData.suit }}</span>
      </div>
    </template>
    <template v-else>
      <div class="tile-back-plate"></div>
      <div class="tile-back-pattern"></div>
      <div class="tile-back-emblem">牌</div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tile: {
    type: Object,
    default: () => ({})
  },
  variant: {
    type: String,
    default: 'small'
  },
  back: {
    type: Boolean,
    default: false
  },
  vertical: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: false
  }
})

const tileData = computed(() => ({
  suitClass: props.tile?.suitClass || 'other',
  numChar: props.tile?.numChar || '',
  suit: props.tile?.suit || '',
  glyph: props.tile?.glyph || '',
  shortLabel: props.tile?.shortLabel || props.tile?.numChar || '',
  tileLabel: props.tile?.tileLabel || props.tile?.name || ''
}))

const showCorners = computed(() => props.variant !== 'small' && !props.vertical)
const showLabel = computed(() => props.variant === 'hand' || props.variant === 'last')
</script>

<style scoped>
.mahjong-tile {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  overflow: hidden;
  user-select: none;
  background: linear-gradient(180deg, #fffef9 0%, #f6f0dd 62%, #e5d4ae 100%);
  border: 1px solid rgba(132, 90, 25, 0.92);
  border-right-color: rgba(114, 77, 20, 0.92);
  border-bottom: 4px solid rgba(103, 68, 14, 0.96);
  border-radius: 9px;
  box-shadow:
    0 9px 18px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -8px 12px rgba(161, 120, 42, 0.12);
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}

.variant-small {
  width: 32px;
  height: 44px;
  padding: 4px 2px 3px;
  border-radius: 7px;
}

.variant-small.vertical {
  width: 22px;
  height: 32px;
  padding: 2px 1px;
  border-radius: 6px;
  border-bottom-width: 3px;
}

.variant-hand {
  width: 62px;
  height: 86px;
  padding: 6px 4px 8px;
  border-radius: 12px;
}

.variant-last {
  width: 68px;
  height: 94px;
  padding: 6px 4px 8px;
  border-radius: 12px;
  box-shadow:
    0 0 28px rgba(255, 215, 107, 0.34),
    0 12px 24px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.94);
}

.mahjong-tile.back {
  justify-content: center;
  background: linear-gradient(180deg, #255637 0%, #173922 58%, #102416 100%);
  border-color: rgba(82, 138, 93, 0.95);
  border-bottom-color: rgba(36, 81, 46, 0.98);
  box-shadow:
    0 7px 14px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.tile-gloss {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 14%, rgba(255, 255, 255, 0.86), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.35), transparent 42%);
  pointer-events: none;
}

.tile-center {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.tile-glyph {
  font-family: 'Segoe UI Symbol', 'Noto Sans Symbols 2', 'Microsoft YaHei UI', sans-serif;
  font-size: 31px;
  line-height: 1;
  text-shadow: 0 2px 0 rgba(255, 255, 255, 0.8);
}

.small-center .tile-glyph {
  font-size: 19px;
}

.variant-small.vertical .tile-glyph {
  font-size: 14px;
}

.tile-corner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  line-height: 1;
}

.tile-corner.bottom {
  transform: rotate(180deg);
}

.corner-rank {
  font-size: 11px;
  font-weight: 800;
}

.corner-suit {
  font-size: 8px;
  opacity: 0.82;
}

.tile-label {
  position: relative;
  z-index: 1;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.08em;
  color: rgba(49, 35, 12, 0.78);
}

.variant-small .tile-label {
  display: none;
}

.tile-back-plate {
  position: absolute;
  inset: 3px;
  border-radius: 6px;
  border: 1px solid rgba(255, 222, 154, 0.18);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent);
}

.tile-back-pattern {
  position: absolute;
  inset: 6px;
  border-radius: 5px;
  background:
    repeating-linear-gradient(45deg, rgba(255, 215, 107, 0.08), rgba(255, 215, 107, 0.08) 3px, transparent 3px, transparent 7px),
    repeating-linear-gradient(-45deg, rgba(255, 215, 107, 0.06), rgba(255, 215, 107, 0.06) 2px, transparent 2px, transparent 8px);
}

.tile-back-emblem {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 222, 154, 0.2);
  color: rgba(255, 235, 184, 0.78);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.interactive:hover {
  transform: translateY(-12px);
  box-shadow:
    0 16px 28px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    inset 0 -10px 14px rgba(161, 120, 42, 0.16);
}

.selected {
  transform: translateY(-18px) !important;
  background: linear-gradient(180deg, #fffef7 0%, #fff1bb 56%, #f0d36f 100%);
  border-color: rgba(218, 161, 44, 0.98);
  border-bottom-color: rgba(166, 112, 10, 0.98);
  box-shadow:
    0 18px 32px rgba(255, 215, 107, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    inset 0 -10px 14px rgba(196, 142, 25, 0.18);
}

.disabled {
  filter: saturate(0.72) brightness(0.9);
  cursor: not-allowed;
}

.accent-wan .tile-glyph,
.accent-wan .corner-rank,
.accent-wan .corner-suit {
  color: #b6202e;
}

.accent-tiao .tile-glyph,
.accent-tiao .corner-rank,
.accent-tiao .corner-suit {
  color: #15743d;
}

.accent-tong .tile-glyph,
.accent-tong .corner-rank,
.accent-tong .corner-suit {
  color: #1c55b8;
}

.accent-feng .tile-glyph,
.accent-feng .corner-rank,
.accent-feng .corner-suit {
  color: #63461b;
}

.accent-zhong .tile-glyph,
.accent-zhong .corner-rank,
.accent-zhong .corner-suit {
  color: #bf1c1c;
}

.accent-fa .tile-glyph,
.accent-fa .corner-rank,
.accent-fa .corner-suit {
  color: #167441;
}

.accent-bai .tile-glyph,
.accent-bai .corner-rank,
.accent-bai .corner-suit {
  color: #4d5c71;
}

.accent-other .tile-glyph,
.accent-other .corner-rank,
.accent-other .corner-suit {
  color: #3c3c3c;
}
</style>
