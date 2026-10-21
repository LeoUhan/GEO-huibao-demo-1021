<script setup lang="ts">
import type { UserRole } from '../data/geo-data'
import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TaskWorkspace from '../components/tasks/TaskWorkspace.vue'
import { useGeoWorkbenchRouteContext } from '../composables/workbench-route-context'

const route = useRoute()
const router = useRouter()
const context = useGeoWorkbenchRouteContext()
const task = computed(() => context.tasks.find(item => item.id === route.params.taskId))
const testRole = shallowRef<UserRole | null>(null)
const clientPreview = computed(() => testRole.value === 'client')
const role = computed(() => testRole.value ?? context.role.value)
const serviceMode = computed(() => context.serviceMode.value)

watch(() => route.params.taskId, (taskId) => {
  testRole.value = null
  if (!context.tasks.some(item => item.id === taskId))
    void router.replace({ name: 'optimization' })
}, { immediate: true })

function setTestRole(nextRole: UserRole) {
  testRole.value = nextRole
}

function goBack() {
  if (typeof window.history.state?.back === 'string') {
    router.back()
    return
  }
  void router.replace({ name: 'optimization' })
}
</script>

<template>
  <TaskWorkspace
    v-if="task"
    :task="task"
    :role="role"
    :service-mode="serviceMode"
    :client-preview="clientPreview"
    @back="goBack"
    @set-test-role="setTestRole"
  />
</template>
