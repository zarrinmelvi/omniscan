<template>
	<div class="skeleton-card" :class="variant">
		<div v-if="variant === 'pantry'" class="sk-image shimmer"></div>
		<div class="sk-lines">
			<div class="sk-line shimmer" style="width: 70%"></div>
			<div class="sk-line shimmer" style="width: 45%"></div>
			<div v-if="variant !== 'stat'" class="sk-line shimmer" style="width: 60%"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
defineProps<{ variant?: 'pantry' | 'stat' | 'row' }>()
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
}
.skeleton-card.row { flex-direction: row; align-items: center; }
.sk-image {
	width: 100%;
	height: 90px;
	border-radius: 10px;
}
.sk-lines { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.sk-line { height: 12px; border-radius: 6px; }
.shimmer {
	background: linear-gradient(90deg, #eef2f7 25%, #e2e8f0 37%, #eef2f7 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
	0% { background-position: 100% 0; }
	100% { background-position: -100% 0; }
}
:global(body.dark) .skeleton-card { background: #1e293b; border-color: #334155; }
:global(body.dark) .shimmer {
	background: linear-gradient(90deg, #334155 25%, #475569 37%, #334155 63%);
	background-size: 400% 100%;
}
</style>
