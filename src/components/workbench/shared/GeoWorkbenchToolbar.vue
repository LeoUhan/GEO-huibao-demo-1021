<script setup lang="ts">
import type { GeoPage, ServiceMode, UserRole } from '../../../data/geo-data'
import { computed, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { processingPages, type CollectionMessage, type ProcessingPage } from '../../../workflows/data-processing'
import { useDataProcessing } from '../../../workflows/data-processing'
import MarketSwitcher from '../../market/MarketSwitcher.vue'
import GeoSectionNav from './GeoSectionNav.vue'

const props = defineProps<{
  activePage: GeoPage | 'overview' | 'visibility-monitoring' | 'report-center' | 'operations-review'
  serviceMode?: ServiceMode
  role: UserRole
}>()
const emit = defineEmits<{ 'update:role': [role: UserRole], 'update:serviceMode': [mode: ServiceMode] }>()
const router = useRouter()
const processing = useDataProcessing()
const statusOpen = shallowRef(false)
const messagesOpen = shallowRef(false)
const messageTab = shallowRef<'unread' | 'pending' | 'history'>('unread')
const visibleMessages = computed(() => processing.messages.value.filter((message) => {
  if (messageTab.value === 'unread') return !message.read
  if (messageTab.value === 'pending') return message.type === 'todo' && message.todoStatus === 'pending'
  return message.read
}))
const pendingItemsCount = computed(() => processing.pendingTodoCount.value)
function messageStatus(message: CollectionMessage) {
  if (message.type === 'todo') return message.todoStatus === 'completed' ? '已处理' : `${message.todoCount ?? 0} 项待处理`
  if (message.type.endsWith('.failed')) return '失败'
  if (message.type === 'monitoring.partial' || message.type === 'strategy.partial' || message.type === 'report.partial') return '部分完成'
  return ''
}
function messageTime(createdAt: number) { const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000)); return minutes < 1 ? '刚刚' : minutes < 60 ? `${minutes} 分钟前` : `${Math.floor(minutes / 60)} 小时前` }
function openPage(page: ProcessingPage) {
  if (!processing.isReady(page).value) return
  statusOpen.value = false
  void router.push({ name: page, query: page === 'visibility-monitoring' ? {} : { version: props.serviceMode === 'agent' ? 'client' : 'managed' } })
}
function openMessage(message: CollectionMessage) {
  processing.markMessageRead(message.id)
  messagesOpen.value = false
  void router.push({ name: message.action.route, params: message.action.params, query: message.action.query })
}
function loadExamples() { processing.loadNotificationExamples(); messageTab.value = 'unread' }
function createTodoBatch() { processing.createPendingTodoBatch(); messageTab.value = 'pending' }
</script>

<template>
  <div class="geo-workbench-toolbar">
    <div class="geo-workbench-toolbar__main">
      <GeoSectionNav :active-page="activePage" />
      <label v-if="activePage === 'diagnosis' || activePage === 'optimization'" class="geo-workbench-toolbar__role">
        <span>产品版本</span>
        <select aria-label="产品版本" :value="serviceMode || 'managed'" @change="emit('update:serviceMode', ($event.target as HTMLSelectElement).value as ServiceMode)">
          <option value="managed">AI + 运营 + 客户</option>
          <option value="agent">AI + 客户</option>
        </select>
      </label>
      <div v-if="serviceMode !== 'agent'" class="geo-workbench-toolbar__role" aria-label="本地模拟角色">
        <span>本地角色</span>
        <div class="geo-role-switch" role="group" aria-label="切换体验角色">
          <button type="button" :aria-pressed="role === 'ops'" :class="{ 'is-active': role === 'ops' }" @click="emit('update:role', 'ops')">
            运营
          </button>
          <button type="button" :aria-pressed="role === 'client'" :class="{ 'is-active': role === 'client' }" @click="emit('update:role', 'client')">
            客户
          </button>
        </div>
      </div>
      <div class="geo-workbench-toolbar__processing">
        <button type="button" class="geo-workbench-toolbar__processing-trigger" :aria-expanded="statusOpen" aria-controls="geo-processing-status" @click="statusOpen = !statusOpen">
          <span v-if="processing.running.value" class="geo-workbench-toolbar__processing-dot" aria-hidden="true" />
          数据状态
          <span v-if="processing.running.value" class="geo-workbench-toolbar__processing-count">{{ processing.completed.value }}/5</span>
        </button>
        <button type="button" class="geo-workbench-toolbar__demo-trigger" @click="processing.start()">演示采集</button>
        <div class="geo-workbench-toolbar__messages">
          <button type="button" class="geo-workbench-toolbar__messages-trigger" :aria-expanded="messagesOpen" aria-controls="geo-collection-messages" @click="messagesOpen = !messagesOpen">
            <span aria-hidden="true">♧</span> 消息通知
            <b v-if="processing.unreadCount.value" class="geo-workbench-toolbar__unread">{{ processing.unreadCount.value }}</b>
          </button>
          <template v-if="messagesOpen">
            <button type="button" class="geo-workbench-toolbar__messages-backdrop" aria-label="关闭消息边栏" @click="messagesOpen = false" />
            <aside id="geo-collection-messages" class="geo-workbench-toolbar__messages-panel" role="dialog" aria-label="消息通知">
              <header><strong>站内通知</strong><div class="geo-workbench-toolbar__panel-actions"><button type="button" class="geo-workbench-toolbar__example-trigger" @click="loadExamples">生成通知示例</button><button type="button" aria-label="关闭消息边栏" @click="messagesOpen = false">×</button></div></header>
              <nav class="geo-workbench-toolbar__message-tabs" aria-label="通知分类">
                <button type="button" :class="{ active: messageTab === 'unread' }" @click="messageTab = 'unread'">未读通知 <b>{{ processing.unreadCount.value }}</b></button>
                <button type="button" :class="{ active: messageTab === 'pending' }" @click="messageTab = 'pending'">待处理 <b>{{ pendingItemsCount }}</b></button>
                <button type="button" :class="{ active: messageTab === 'history' }" @click="messageTab = 'history'">历史通知 <b>{{ processing.messages.value.filter(message => message.read).length }}</b></button>
              </nav>
              <div v-if="messageTab === 'pending'" class="geo-workbench-toolbar__pending-actions"><button type="button" @click="createTodoBatch">新建待办批次</button></div>
              <div v-if="messageTab === 'history'" class="geo-workbench-toolbar__history-actions"><button type="button" :disabled="!processing.messages.value.some(message => message.read)" @click="processing.clearReadMessages()">清空历史通知</button></div>
              <p v-if="!visibleMessages.length" class="geo-workbench-toolbar__messages-empty">{{ messageTab === 'unread' ? '暂无未读通知' : messageTab === 'pending' ? '暂无待处理事项' : '暂无历史通知' }}</p>
              <article v-for="message in visibleMessages" :key="message.id" class="geo-workbench-toolbar__message-item">
                <div class="geo-workbench-toolbar__message-meta"><span><i :class="{ read: message.read }" />{{ message.category }}</span><time>{{ messageTime(message.createdAt) }}</time><b v-if="messageStatus(message)" class="geo-workbench-toolbar__message-status" :class="{ 'is-error': message.type.endsWith('.failed'), 'is-done': message.todoStatus === 'completed' }">{{ messageStatus(message) }}</b><button v-if="!message.read && messageTab === 'unread'" type="button" class="geo-workbench-toolbar__mark-read" @click="processing.markMessageRead(message.id)">标为已读</button></div>
                <div class="geo-workbench-toolbar__message-content">
                  <span class="geo-workbench-toolbar__message-main"><strong>{{ message.title }}</strong><span class="geo-workbench-toolbar__message-description">{{ message.body }}</span></span>
                  <div class="geo-workbench-toolbar__message-actions"><button type="button" class="geo-workbench-toolbar__message-action" @click="openMessage(message)">{{ message.action.label }}</button></div>
                </div>
              </article>
            </aside>
          </template>
        </div>
        <div v-if="statusOpen" id="geo-processing-status" class="geo-workbench-toolbar__processing-panel" role="status">
          <strong>数据处理进度</strong>
          <p v-if="!processing.hasRun.value">暂无正在处理的数据</p>
          <p v-else-if="processing.running.value">预计需要 10～20 分钟</p>
          <p v-else>本轮数据已全部处理完成</p>
          <div v-if="processing.hasRun.value" class="geo-workbench-toolbar__processing-list">
            <button v-for="(page, index) in processingPages" :key="page" type="button" :disabled="!processing.isReady(page).value" @click="openPage(page)">
              <span>{{ processing.labels[page] }}</span>
              <small>{{ processing.completed.value > index ? '已完成 · 查看 →' : processing.completed.value === index ? '处理中' : '等待中' }}</small>
            </button>
          </div>
        </div>
      </div>
      <div class="geo-workbench-toolbar__market">
        <MarketSwitcher />
      </div>
    </div>
  </div>
</template>

<style scoped>
select { padding: 6px 10px; border: 1px solid var(--border-default); border-radius: 6px; background: var(--background-primary); color: var(--text-primary); font: inherit; }
.geo-workbench-toolbar__processing { position: relative; flex: 0 0 auto; display:flex; align-items:center; gap:6px; }
.geo-workbench-toolbar__demo-trigger { border:1px solid var(--border-default); border-radius:8px; background:var(--background-primary); color:var(--text-secondary); padding:7px 9px; cursor:pointer; font:inherit; font-size:12px; }
.geo-workbench-toolbar__messages { position:relative; }
.geo-workbench-toolbar__messages-trigger { position:relative; min-height:36px; padding:6px 12px; border:1px solid var(--border-default); border-radius:8px; background:var(--background-primary); color:var(--text-primary); font:inherit; cursor:pointer; }
.geo-workbench-toolbar__unread { position:absolute; top:-7px; right:-7px; min-width:17px; height:17px; padding:0 4px; border-radius:9px; background:#e5484d; color:#fff; font-size:11px; line-height:17px; }
.geo-workbench-toolbar__messages-backdrop { position:fixed; inset:0; z-index:79; border:0; background:#18223055; }
.geo-workbench-toolbar__messages-panel { position:fixed; z-index:80; inset:0 0 0 auto; box-sizing:border-box; width:min(420px, 92vw); padding:24px 24px 32px; background:var(--background-primary); box-shadow:-8px 0 30px #1720331a; overflow:auto; }
.geo-workbench-toolbar__messages-panel header { display:flex; justify-content:space-between; align-items:center; min-height:48px; padding:0 0 14px; border-bottom:1px solid var(--border-default); }
.geo-workbench-toolbar__messages-panel header strong { color:var(--text-primary); font-size:19px; font-weight:650; }
.geo-workbench-toolbar__panel-actions { display:flex; align-items:center; gap:8px; }
.geo-workbench-toolbar__messages-panel header button { width:36px; height:36px; border:0; border-radius:8px; background:var(--background-subtle); color:var(--text-secondary); font-size:24px; line-height:1; cursor:pointer; }
.geo-workbench-toolbar__messages-panel header .geo-workbench-toolbar__example-trigger { width:auto; height:auto; padding:7px 10px; border:1px solid var(--border-default); border-radius:8px; background:var(--background-primary); color:var(--text-secondary); font-size:12px; }
.geo-workbench-toolbar__message-tabs { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; margin:18px 0; padding:5px; border-radius:11px; background:var(--background-subtle); }
.geo-workbench-toolbar__message-tabs button { min-height:42px; border:0; border-radius:8px; background:transparent; color:var(--text-secondary); font:inherit; font-size:13px; font-weight:600; cursor:pointer; }
.geo-workbench-toolbar__message-tabs button.active { background:var(--background-primary); color:var(--action-accent); box-shadow:0 1px 4px #17203312; }
.geo-workbench-toolbar__message-tabs b { margin-left:4px; padding:2px 6px; border-radius:10px; background:var(--background-subtle); font-size:11px; }
.geo-workbench-toolbar__pending-actions { display:flex; justify-content:space-between; align-items:center; gap:8px; margin:-7px 0 12px; color:var(--text-secondary); font-size:11px; }
.geo-workbench-toolbar__pending-actions button { padding:6px 9px; border:1px solid var(--border-default); border-radius:7px; background:var(--background-primary); color:var(--action-accent); font:inherit; cursor:pointer; white-space:nowrap; }
.geo-workbench-toolbar__history-actions { display:flex; justify-content:flex-end; margin:-8px 0 12px; }
.geo-workbench-toolbar__history-actions button { padding:5px 0; border:0; background:transparent; color:var(--text-secondary); font:inherit; font-size:12px; cursor:pointer; }
.geo-workbench-toolbar__history-actions button:hover:not(:disabled) { color:var(--status-error-foreground, #c2413b); }
.geo-workbench-toolbar__history-actions button:disabled { opacity:.45; cursor:default; }
.geo-workbench-toolbar__messages-empty { padding:18px 4px; color:var(--text-secondary); text-align:center; font-size:13px; }
.geo-workbench-toolbar__message-item { display:grid; width:100%; min-height:92px; gap:8px; margin-bottom:10px; padding:12px 16px; border:1px solid #d7e4f5; border-radius:12px; background:#f8fbff; color:var(--text-primary); }
.geo-workbench-toolbar__message-item:hover { border-color:#aac8ee; background:#f2f7ff; }
.geo-workbench-toolbar__message-content { display:block; width:100%; padding:3px 0; border:0; background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.geo-workbench-toolbar__mark-read { margin-left:auto; padding:2px 0; border:0; background:transparent; color:var(--action-accent); font:inherit; font-size:12px; cursor:pointer; }
.geo-workbench-toolbar__mark-read:hover { text-decoration:underline; }
.geo-workbench-toolbar__message-main { display:grid; flex:1; gap:7px; min-width:0; width:100%; }
.geo-workbench-toolbar__message-meta { display:flex; align-items:center; gap:7px; color:var(--action-accent); font-size:12px; font-weight:600; }
.geo-workbench-toolbar__message-meta>span { display:flex; align-items:center; gap:7px; color:var(--action-accent); font-size:12px; font-weight:600; }
.geo-workbench-toolbar__message-meta i { width:8px; height:8px; border-radius:50%; background:#5b9bd5; }
.geo-workbench-toolbar__message-meta i.read { background:#b8c2cf; }
.geo-workbench-toolbar__message-status { padding:3px 7px; border-radius:10px; background:#fff5df; color:#a16207; font-size:10px; font-weight:600; white-space:nowrap; }
.geo-workbench-toolbar__message-status.is-error { background:#fff0f0; color:#b42318; }
.geo-workbench-toolbar__message-status.is-done { background:#e9f8ef; color:#15803d; }
.geo-workbench-toolbar__message-meta time { color:var(--text-secondary); font-size:11px; font-weight:400; }
.geo-workbench-toolbar__message-main strong { font-size:14px; font-weight:650; }
.geo-workbench-toolbar__message-description { color:var(--text-secondary); font-size:12px; line-height:1.5; }
.geo-workbench-toolbar__message-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:2px; }
.geo-workbench-toolbar__message-action { padding:7px 10px; border:1px solid var(--action-accent); border-radius:7px; background:var(--action-accent); color:#fff; font:inherit; font-size:12px; font-weight:600; cursor:pointer; }
.geo-workbench-toolbar__processing-trigger { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 6px 10px; border: 1px solid var(--action-accent); border-radius: 8px; background: var(--action-subtle-background); color: var(--action-accent); font: inherit; font-weight: 600; cursor: pointer; white-space: nowrap; }
.geo-workbench-toolbar__processing-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--action-accent); }
.geo-workbench-toolbar__processing-count { color: var(--action-accent); font-size: 12px; }
.geo-workbench-toolbar__processing-panel { position: absolute; top: calc(100% + 8px); right: 0; z-index: 40; box-sizing: border-box; width: 290px; max-width: calc(100vw - 32px); padding: 16px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--background-primary); box-shadow: var(--shadow-floating); }
.geo-workbench-toolbar__processing-panel strong { font-size: 14px; }
.geo-workbench-toolbar__processing-panel p { margin: 6px 0 12px; color: var(--text-secondary); font-size: 12px; }
.geo-workbench-toolbar__processing-list { display: grid; gap: 4px; }
.geo-workbench-toolbar__processing-list button { display: flex; justify-content: space-between; gap: 8px; width: 100%; padding: 9px 8px; border: 0; border-radius: 7px; background: transparent; color: var(--text-primary); font: inherit; text-align: left; cursor: pointer; }
.geo-workbench-toolbar__processing-list button:hover:not(:disabled) { background: var(--background-subtle); }
.geo-workbench-toolbar__processing-list button:disabled { cursor: default; }
.geo-workbench-toolbar__processing-list small { color: var(--text-secondary); white-space: nowrap; }
</style>
