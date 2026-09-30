<template>
  <img 
    :src="src" 
    :alt="alt"
    :width="width"
    :height="height"
    :class="imageClass"
    loading="lazy"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  objectFit?: 'cover' | 'contain';
}

const props = withDefaults(defineProps<Props>(), {
  objectFit: 'cover'
});

const imageClass = computed(() => ({
  'image-cover': props.objectFit === 'cover',
  'image-contain': props.objectFit === 'contain',
}));
</script>

<style scoped>
/* Base responsive image behavior */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Grid images: cover for consistent dimensions */
.image-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Detail view images: contain to show full image */
.image-contain {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
