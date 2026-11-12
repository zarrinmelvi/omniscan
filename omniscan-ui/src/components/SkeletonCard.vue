<template>
	<div class="skeleton-card" :class="variant" role="status" aria-busy="true" aria-live="polite">
		<span class="sr-only">Loading</span>

		<!-- hero: pantry item detail (image block, title, meta lines) -->
		<template v-if="variant === 'hero'">
			<div class="sk-hero shimmer"></div>
			<div class="sk-lines">
				<div class="sk-line sk-line--title shimmer" style="width: 65%"></div>
				<div class="sk-line shimmer" style="width: 40%"></div>
				<div class="sk-line shimmer" style="width: 85%"></div>
				<div class="sk-line shimmer" style="width: 70%"></div>
			</div>
		</template>

		<!-- recipe: image on top, title and meta lines -->
		<template v-else-if="variant === 'recipe'">
			<div class="sk-recipe-image shimmer"></div>
			<div class="sk-lines">
				<div class="sk-line sk-line--title shimmer" style="width: 75%"></div>
				<div class="sk-line shimmer" style="width: 50%"></div>
				<div class="sk-line shimmer" style="width: 35%"></div>
			</div>
		</template>

		<!-- profile: avatar, name and form-like rows -->
		<template v-else-if="variant === 'profile'">
			<div class="sk-profile-head">
				<div class="sk-avatar shimmer"></div>
				<div class="sk-lines">
					<div class="sk-line sk-line--title shimmer" style="width: 55%"></div>
					<div class="sk-line shimmer" style="width: 40%"></div>
				</div>
			</div>
			<div class="sk-line sk-line--field shimmer" style="width: 100%"></div>
			<div class="sk-line sk-line--field shimmer" style="width: 100%"></div>
			<div class="sk-line sk-line--field shimmer" style="width: 100%"></div>
		</template>

		<template v-else>
			<div v-if="variant === 'pantry'" class="sk-image shimmer"></div>
			<div class="sk-lines">
				<div class="sk-line shimmer" style="width: 70%"></div>
				<div class="sk-line shimmer" style="width: 45%"></div>
				<div v-if="variant !== 'stat'" class="sk-line shimmer" style="width: 60%"></div>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
defineProps<{ variant?: 'pantry' | 'stat' | 'row' | 'hero' | 'recipe' | 'profile' }>()
</script>

<style scoped>
.skeleton-card {
	background: #ffffff;
	border: 1px solid #eef2f7;
	border-radius: 14px;
	padding: 14px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	position: relative;
}
.skeleton-card.row { flex-direction: row; align-items: center; }
.skeleton-card.hero,
.skeleton-card.recipe { padding: 0; overflow: hidden; }
.skeleton-card.hero .sk-lines,
.skeleton-card.recipe .sk-lines { padding: 14px; }
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}
.sk-image {
	width: 100%;
	height: 90px;
	border-radius: 10px;
}
.sk-hero { width: 100%; height: 240px; }
.sk-recipe-image { width: 100%; height: 160px; }
.sk-profile-head { display: flex; align-items: center; gap: 14px; }
.sk-avatar { width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0; }
.sk-lines { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.sk-line { height: 12px; border-radius: 6px; }
.sk-line--title { height: 18px; }
.sk-line--field { height: 44px; border-radius: 10px; }
.shimmer {
	background: linear-gradient(90deg, #eef2f7 25%, #e2e8f0 37%, #eef2f7 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
	0% { background-position: 100% 0; }
	100% { background-position: -100% 0; }
}
@media (prefers-reduced-motion: reduce) {
	.shimmer { animation: none; }
}
html.ion-palette-dark .skeleton-card { background: #1e293b; border-color: #334155; }
html.ion-palette-dark .shimmer {
	background: linear-gradient(90deg, #334155 25%, #475569 37%, #334155 63%);
	background-size: 400% 100%;
}
@media (prefers-reduced-motion: reduce) {
	html.ion-palette-dark .shimmer { animation: none; }
}
</style>
