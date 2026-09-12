<template>
  <div class="favorites-page-container fade-in" @contextmenu.prevent>
    <!-- 固定顶部标题：与景点列表页面标题字体及大小完全一致 -->
    <header class="page-header">
      <div class="header-content">
        <div class="title-text-group">
          <h1 class="page-title title-hero">收藏列表</h1>
        </div>
      </div>
    </header>

    <!-- 主体内容：与景点列表页面的收藏列表菜单功能完全一致，但填充满整个屏幕 -->
    <main class="favorites-full-menu card">
      <!-- 收藏多选项卡（Tabs） -->
      <div class="fav-tabs-wrap" ref="favTabsWrap">
        <div
          class="fav-tabs"
          ref="favTabs"
          :class="{ draggingTabs: tabDragging }"
          @wheel.prevent="onTabsWheel"
          @touchmove="onTabsTouchMove"
        >
          <template v-for="(tab, ti) in sortedTabs" :key="tab.id">
            <div
              v-if="tabDragging && tabPlaceholderIndex === ti"
              class="tab-placeholder"
              :style="{ width: getDraggedTabWidth() + 'px', minWidth: getDraggedTabWidth() + 'px' }"
            ></div>
            <div
              class="fav-tab"
              :class="{ active: tab.id === activeTabId, dragging: tabDragging && tabDragIndex === ti }"
              :style="tabDragging && tabFixedWidths[ti] ? { width: tabFixedWidths[ti] + 'px' } : {}"
              @mousedown.prevent="onTabPressStart(ti, $event)"
              @touchstart.passive="onTabPressStart(ti, $event)"
              @click.stop="onTabClick(tab, ti, $event)"
            >
              <template v-if="editingTabId === tab.id">
                <span
                  class="tab-editable"
                  :ref="'tabEdit_' + tab.id"
                  contenteditable="true"
                  spellcheck="false"
                  @compositionstart="tabEditingComposing = true"
                  @compositionend="onTabCompositionEnd(tab, $event)"
                  @input="onTabNameInput(tab, $event)"
                  @keydown.enter.prevent="onTabEditEnter($event)"
                  @keydown.esc.prevent="onTabEditEsc($event)"
                  @blur="finishEditTab(true)"
                ></span>
              </template>
              <template v-else>
                {{ tab.name }}
              </template>
            </div>
          </template>
          <div
            v-if="tabDragging && tabPlaceholderIndex === sortedTabs.length"
            class="tab-placeholder"
            :style="{ width: getDraggedTabWidth() + 'px', minWidth: getDraggedTabWidth() + 'px' }"
          ></div>
          <div class="tab-plus" @click.stop="addNewTab" title="新增收藏列表">+</div>
        </div>
      </div>

      <!-- Tab 拖拽镜像 -->
      <div
        v-if="tabDragging && tabDragItem"
        class="tab-ghost"
        :style="{ position: 'fixed', top: (tabGhostTop) + 'px', left: (tabGhostLeft) + 'px', width: (tabGhostWidth || 40) + 'px' }"
      >
        {{ tabDragItem.name }}
      </div>

      <!-- 收藏列表项容器 -->
      <transition-group
        ref="favoritesList"
        name="fav-move"
        tag="div"
        class="favorites-list"
        @touchstart.passive="onFavoritesListTouchStart"
        @touchmove.passive="onFavoritesListTouchMove"
        @touchend.passive="onFavoritesListTouchEnd"
      >
        <div
          v-for="node in favoritesMoveNodes"
          :key="node.key"
          :data-fav-placeholder="node.type === 'placeholder' ? 'active' : null"
          :class="
            node.type === 'placeholder'
              ? 'favorites-placeholder'
              : {
                  'favorites-item': true,
                  'dragging-shadow': dragging && dragIndex === node.index,
                  'pending': !!(node.f && node.f.pending),
                  'just-inserted': !dragging && recentlyMovedId === (node.f && node.f.id)
                }
          "
          :style="node.type === 'placeholder' ? placeholderStyle : null"
          @mousedown="onFavoritesNodeMouseDown(node, $event)"
          @touchstart="onFavoritesNodeTouchStart(node, $event)"
          @touchmove="onFavoritesNodeTouchMove(node, $event)"
          @touchend="onFavoritesNodeTouchEnd(node, $event)"
          @click="onFavoritesNodeClick(node, $event)"
          @contextmenu="onFavoritesNodeContextMenu(node, $event)"
        >
          <template v-if="node.type === 'item'">
            <!-- 右侧滑动操作（待定） -->
            <div :class="['fav-right-actions', { visible: isFavRightActionsVisible(node.f) }]">
              <button class="fav-pending" :class="{ active: !!(node.f && node.f.pending) }" @click.stop="togglePending(node.f)">
                {{ node.f && node.f.pending ? "取消" : "待定" }}
              </button>
            </div>
            <!-- 左侧滑动操作（删除/移除） -->
            <div :class="['fav-left-actions', { visible: isFavActionsVisible(node.f) }]">
              <button class="fav-delete" @click.stop="removeFavorite(node.f)">
                {{ String(node.f && node.f.country) === 'custom' ? '删除' : '移除' }}
              </button>
            </div>
            <!-- 收藏项内容主区域 -->
            <div class="fav-content" :style="{ transform: `translateX(${getFavSwipeOffset(node.f)}px)` }">
              <span class="fav-index" v-if="node.f && !node.f.pending">{{ getNonPendingIndex(node.index) }}</span>
              <div class="fav-thumb-wrap">
                <img
                  v-if="node.f && favThumbs[thumbKey(node.f)]"
                  :src="node.f ? favThumbs[thumbKey(node.f)] : ''"
                  alt="缩略图"
                  class="fav-thumb"
                />
                <div v-else class="fav-thumb thumb-placeholder"></div>
              </div>
              <div class="fav-main">
                <span class="fav-name">{{ node.f && node.f.name }}</span>
                <span class="fav-meta">{{ node.f && node.f.region }}</span>
              </div>
              <div v-if="node.f" class="fav-right-meta">
                <span class="fav-date-slot">
                  <button
                    type="button"
                    class="fav-date-trigger"
                    :class="{ selected: hasFavoriteDate(node.f), 'date-flashing': isFavoriteDateFlashing(node.f) }"
                    @click.stop="openFavoriteDatePicker(node.f)"
                  >
                    <template v-if="hasFavoriteDate(node.f)">
                      <span class="fav-date-lines">
                        <span class="fav-date-year">{{ getFavoriteDateYear(node.f) }}</span>
                        <span class="fav-date-md">{{ getFavoriteDateMonthDay(node.f) }}</span>
                        <span class="fav-date-weekday">{{ getFavoriteDateWeekday(node.f) }}</span>
                      </span>
                    </template>
                    <template v-else>
                      <svg class="fav-date-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9ZM5 6a1 1 0 0 0-1 1v1h16V7a1 1 0 0 0-1-1H5Z"></path>
                      </svg>
                    </template>
                  </button>
                  <input
                    v-if="!useCustomFavoriteDatePicker"
                    :ref="getFavoriteDateInputRefKey(node.f)"
                    type="date"
                    class="fav-date-native-input"
                    :value="normalizeFavoriteDate(node.f.favoriteDate)"
                    @click.stop
                    @touchstart.stop
                    @input="onFavoriteDateNativeInput(node.f, $event)"
                    @change="onFavoriteDateNativeInput(node.f, $event)"
                    tabindex="-1"
                  />
                </span>
                <span class="fav-rating-slot">
                  <span
                    v-if="String(node.f.country) !== 'custom' && node.f.rating !== undefined && node.f.rating !== null && node.f.rating !== ''"
                    class="fav-rating"
                    :style="{ backgroundColor: getRatingColor(node.f.rating) }"
                  >{{ node.f && node.f.rating }}</span>
                </span>
              </div>
            </div>
          </template>
        </div>

        <!-- 创建自创景点的 + 项 -->
        <div key="fav-add" class="favorites-add" @click.stop="showCreateModal = true" title="创建景点">
          <div class="plus-circle">+</div>
        </div>

        <!-- 导入/导出按钮行 -->
        <div key="fav-actions" class="favorites-actions-row">
          <button class="favorites-action-btn" @click.stop="onImportClick">导入</button>
          <button class="favorites-action-btn primary" @click.stop="promptExportFavorites">导出</button>
          <input
            ref="importFileInput"
            type="file"
            accept=".json,application/json,application/*+json,text/json,text/plain"
            class="hidden-file-input"
            @change="handleImportFile"
          />
        </div>

        <!-- 删除收藏列表操作 -->
        <div key="fav-clear" class="favorites-clear" @click="promptClearFavorites">
          🗑️ 删除收藏
        </div>
      </transition-group>

      <!-- 拖拽中的浮动项镜像 -->
      <div
        v-if="dragging && dragItem"
        :style="{
          position: 'fixed',
          top: (dragY - dragOffsetY) + 'px',
          left: (dragLeft) + 'px',
          width: (dragWidth) + 'px',
          pointerEvents: 'none',
          zIndex: 1001,
        }"
      >
        <div class="favorites-item dragging-shadow">
          <div class="fav-main">
            <span class="fav-name">{{ dragItem.name }}</span>
            <span class="fav-meta">{{ dragItem.region }}</span>
          </div>
          <span
            v-if="String(dragItem.country) !== 'custom' && dragItem && dragItem.rating !== undefined && dragItem.rating !== null && dragItem.rating !== ''"
            class="fav-rating"
            :style="{ backgroundColor: getRatingColor(dragItem.rating) }"
          >{{ dragItem.rating }}</span>
        </div>
      </div>
    </main>

    <!-- 页面左下角固定返回按钮：点击返回国家列表页面 -->
    <button class="back-button bottom-left-back-btn" @click="goBack">
      返回
    </button>

    <!-- 自创景点弹窗 -->
    <CreateAttractionModal v-model="showCreateModal" county-label="县/市" @created="onCustomCreated" />

    <!-- 收藏日期弹窗 -->
    <teleport to="body">
      <div v-if="showFavoriteDateModal" class="confirm-backdrop favorite-date-backdrop" @click="closeFavoriteDateModal">
        <div class="confirm-dialog favorite-date-dialog" @click.stop>
          <div class="favorite-date-header">
            <div class="favorite-date-title">选择日期</div>
          </div>
          <div class="favorite-date-toolbar">
            <button type="button" class="favorite-date-nav-btn" @click="shiftFavoriteDateModalMonth(-1)">&#x2039;</button>
            <div class="favorite-date-selects">
              <select v-model.number="favoriteDateModalYear" class="favorite-date-select">
                <option v-for="year in favoriteDateYearOptions" :key="year" :value="year">{{ year }} 年</option>
              </select>
              <select v-model.number="favoriteDateModalMonth" class="favorite-date-select">
                <option v-for="month in 12" :key="month" :value="month">{{ month }} 月</option>
              </select>
            </div>
            <button type="button" class="favorite-date-nav-btn" @click="shiftFavoriteDateModalMonth(1)">&#x203A;</button>
          </div>
          <div class="favorite-date-weekdays">
            <span v-for="label in favoriteDateWeekdayHeaders" :key="label">{{ label }}</span>
          </div>
          <div class="favorite-date-grid">
            <button
              v-for="cell in favoriteDateCalendarCells"
              :key="cell.key"
              type="button"
              class="favorite-date-day"
              :class="{ muted: !cell.currentMonth, selected: cell.selected, today: cell.today }"
              @click="selectFavoriteDateCalendarCell(cell)"
            >
              {{ cell.day }}
            </button>
          </div>
          <div class="favorite-date-actions">
            <button type="button" class="favorite-date-action-link clear" @click="clearFavoriteDateModal">清除</button>
            <button type="button" class="favorite-date-action-link today" @click="setFavoriteDateModalToday">今天</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 导出选项弹窗（单个/全部） -->
    <teleport to="body">
      <div v-if="showExportChoice" class="confirm-backdrop" @click="closeExportChoice">
        <div class="confirm-dialog has-close" @click.stop>
          <button class="confirm-close" aria-label="关闭" @click="closeExportChoice">×</button>
          <div class="confirm-message">导出当前收藏列表或全部收藏列表？</div>
          <div class="confirm-actions">
            <button class="btn-cancel" @click="exportChoiceCurrent">当前</button>
            <button class="btn-primary" @click="exportChoiceAll">全部</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 导出进度弹窗 -->
    <teleport to="body">
      <div v-if="exporting" class="confirm-backdrop" @click.stop>
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-message">
            <div class="export-progress-header">
              <span class="export-progress-text">正在导出收藏，请稍候...</span>
              <span class="export-progress-count" v-if="exportTotal">
                {{ exportProgress }} / {{ exportTotal }}
              </span>
            </div>
            <div class="export-progress-bar" v-if="exportTotal">
              <div
                class="export-progress-fill"
                :style="{ width: Math.min(100, Math.max(0, (exportProgress / exportTotal) * 100)) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 导出回退复制弹窗 -->
    <teleport to="body">
      <div v-if="showExportModal" class="confirm-backdrop" @click="closeExportFallback">
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-message">某些浏览器不支持直接保存文件。你可以复制内容或在新页面打开后通过“分享/保存到文件”。</div>
          <div class="export-area-wrap">
            <textarea ref="exportArea" class="export-textarea" readonly :value="exportJsonText"></textarea>
          </div>
          <div class="confirm-actions">
            <button class="btn-cancel" @click="closeExportFallback">关闭</button>
            <button class="btn-danger" @click="copyExportJson">复制内容</button>
            <button class="btn-primary" @click="openExportDataUrl">在新页面打开</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 导入粘贴弹窗 -->
    <teleport to="body">
      <div v-if="showImportPaste" class="confirm-backdrop" @click="cancelImportPaste">
        <div class="confirm-dialog has-close" @click.stop>
          <button class="confirm-close" aria-label="关闭" @click="cancelImportPaste">×</button>
          <div class="confirm-message">无法读取所选文件，请粘贴json文件内文本导入</div>
          <div class="export-area-wrap">
            <textarea v-model="importPasteText" class="export-textarea" placeholder="在此粘贴 JSON 文本"></textarea>
          </div>
          <div class="confirm-actions">
            <button class="btn-cancel" @click="cancelImportPaste">取消</button>
            <button class="btn-primary" @click="confirmImportPaste">确认</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 删除选项卡确认弹窗 -->
    <teleport to="body">
      <div v-if="tabDeleteConfirmVisible" class="confirm-backdrop" @click="cancelDeleteTab">
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-message">
            确定要<span class="danger-word">删除</span>该收藏列表吗？
          </div>
          <div class="confirm-actions">
            <button class="btn-cancel" @click="cancelDeleteTab">取消</button>
            <button class="btn-danger" @click="performDeleteTab">删除</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 删除收藏项确认弹窗 -->
    <teleport to="body">
      <div v-if="itemDeleteConfirmVisible" class="confirm-backdrop" @click="cancelDeleteItem">
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-message">
            <template v-if="itemDeleteTarget && String(itemDeleteTarget.country) === 'custom'">
              确定要<span class="danger-word">删除</span>该自创景点吗？
            </template>
            <template v-else>
              确定要移除该景点吗？
            </template>
          </div>
          <div class="confirm-actions">
            <button class="btn-cancel" @click="cancelDeleteItem">取消</button>
            <button class="btn-danger" @click="performDeleteItem">
              {{ (itemDeleteTarget && String(itemDeleteTarget.country) === 'custom') ? '删除' : '移除' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 收藏项右键/长按菜单 -->
    <teleport to="body">
      <div
        v-if="favoritesContextMenuVisible"
        ref="favoritesContextMenu"
        class="favorites-context-menu"
        :style="favoritesContextMenuStyle"
        @contextmenu.prevent
      >
        <button
          class="context-menu-item fav-pending"
          :class="{ active: favoritesContextMenuTarget && !!favoritesContextMenuTarget.pending }"
          @click.stop="onFavoritesContextMenuPending"
        >
          {{ favoritesContextMenuTarget && favoritesContextMenuTarget.pending ? '取消' : '待定' }}
        </button>
        <button class="context-menu-item fav-delete" @click.stop="onFavoritesContextMenuRemove">
          {{ (favoritesContextMenuTarget && String(favoritesContextMenuTarget.country) === 'custom') ? '删除' : '移除' }}
        </button>
      </div>
    </teleport>
  </div>
</template>

<script>
import { openDB } from 'idb';
import CreateAttractionModal from './CreateAttractionModal.vue';
import { findCustomAttractionById, deleteCustomAttraction, saveAllCustomAttractions } from '../utils/customAttractions.js';
import { getImageUrl as getCustomImageUrl, deleteImagesForId as deleteCustomImagesForId, setImage as setCustomImage } from '../utils/customImageStore.js';
import { normalizeFavoriteDate as normalizeFavoriteDateValue, getFavoriteDateWeekdayLabel } from '../utils/favoriteDate.js';
import { ensureUserDataHydrated, queueUserDataSync, deleteCustomImages } from '../stores/userDataSync.js';
import { invalidateAttractionMapCache } from '../stores/attractionMapCache.js';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export default {
  name: 'FavoritesView',
  components: { CreateAttractionModal },
  data() {
    return {
      favoriteTabs: [],
      activeTabId: null,
      favorites: [],
      favThumbs: {},

      // 选项卡编辑与拖拽
      editingTabId: null,
      editingTabName: '',
      tabEditingComposing: false,
      tabDragging: false,
      tabDragIndex: -1,
      tabPlaceholderIndex: -1,
      tabDragItem: null,
      tabOffsetX: 0,
      tabGhostLeft: 0,
      tabGhostTop: 0,
      tabGhostWidth: 0,
      tabGhostHeight: 0,
      tabFixedWidths: [],
      tabAutoScrollFrame: null,

      // 列表拖拽重排
      dragging: false,
      dragIndex: -1,
      placeholderIndex: -1,
      dragItem: null,
      dragY: 0,
      dragOffsetY: 0,
      dragLeft: 20,
      dragWidth: 320,
      recentlyMovedId: null,
      recentlyMovedTimer: null,
      itemTops: [],
      dragListRect: null,
      tabHoverTimer: null,
      tabHoverCandidateId: null,

      // 滑动操作（左滑删除，右滑待定）
      favTouchTracking: false,
      favTouchStartX: 0,
      favTouchStartY: 0,
      favTouchIdentifier: null,
      favSwipeActive: false,
      favSwipeItemId: null,
      favSwipeOffsetX: 0,
      favActionId: null,
      favRightActionId: null,
      favRightSwipeItemId: null,
      favRightSwipeOffsetX: 0,
      swipeResetTimer: null,

      // 日期选择
      useCustomFavoriteDatePicker: true,
      showFavoriteDateModal: false,
      favoriteDateModalTarget: null,
      favoriteDateModalYear: 2026,
      favoriteDateModalMonth: 1,
      favoriteDateModalValue: '',
      favoriteDateClickLockUntil: 0,
      favoriteDateFlashStates: {},
      favoriteDateFlashTimers: {},

      // 导入导出
      showCreateModal: false,
      showExportChoice: false,
      showExportModal: false,
      exporting: false,
      exportProgress: 0,
      exportTotal: 0,
      exportJsonText: '',
      exportFileName: '',
      exportDataUrl: '',
      showImportPaste: false,
      importPasteText: '',

      // 弹窗确认
      tabDeleteConfirmVisible: false,
      tabDeleteTargetId: null,
      itemDeleteConfirmVisible: false,
      itemDeleteTarget: null,

      // 右键上下文菜单
      favoritesContextMenuVisible: false,
      favoritesContextMenuStyle: {},
      favoritesContextMenuTarget: null,
      favoritesContextMenuOutsideHandler: null,
      favoritesContextMenuDismissHandler: null,
      favoritesContextMenuInteractionLock: false,
      favoritesContextMenuLockTimer: null,

      // 防抖与硬件返回
      clickGuard: false,
      clickGuardTimer: null,
      _onHardwareBack: null,
    };
  },
  computed: {
    sortedTabs() {
      return [...this.favoriteTabs].sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    sortedFavorites() {
      return [...this.favorites].sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    favoritesMoveNodes() {
      const items = this.sortedFavorites;
      if (!this.dragging) {
        return items.map((f, index) => ({
          type: 'item',
          f,
          index,
          key: this.makeFavoriteKey(f)
        }));
      }
      const nodes = [];
      const len = items.length;
      const target = Math.max(0, Math.min(this.placeholderIndex, len));
      for (let i = 0; i <= len; i++) {
        if (i === target) {
          nodes.push({ type: 'placeholder', key: '__placeholder__' });
        }
        if (i < len) {
          const f = items[i];
          nodes.push({
            type: 'item',
            f,
            index: i,
            key: this.makeFavoriteKey(f)
          });
        }
      }
      return nodes;
    },
    placeholderStyle() {
      return { height: '62px' };
    },
    favoriteDateYearOptions() {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let y = currentYear - 5; y <= currentYear + 10; y++) {
        years.push(y);
      }
      return years;
    },
    favoriteDateWeekdayHeaders() {
      return ['一', '二', '三', '四', '五', '六', '日'];
    },
    favoriteDateCalendarCells() {
      const year = Number(this.favoriteDateModalYear);
      const month = Number(this.favoriteDateModalMonth);
      if (!year || !month) return [];
      const firstDay = new Date(year, month - 1, 1);
      const firstWeekday = (firstDay.getDay() + 6) % 7;
      const daysInMonth = new Date(year, month, 0).getDate();
      const prevMonthDays = new Date(year, month - 1, 0).getDate();
      const todayStr = this.formatDateIso(new Date());
      const selectedStr = this.favoriteDateModalValue;
      const cells = [];

      for (let i = firstWeekday - 1; i >= 0; i--) {
        const d = prevMonthDays - i;
        const prevDate = new Date(year, month - 2, d);
        const iso = this.formatDateIso(prevDate);
        cells.push({
          key: `prev-${d}`,
          day: d,
          value: iso,
          currentMonth: false,
          selected: iso === selectedStr,
          today: iso === todayStr
        });
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const iso = this.formatDateParts(year, month, d);
        cells.push({
          key: `cur-${d}`,
          day: d,
          value: iso,
          currentMonth: true,
          selected: iso === selectedStr,
          today: iso === todayStr
        });
      }

      const totalCells = Math.ceil(cells.length / 7) * 7;
      let nextDay = 1;
      while (cells.length < totalCells) {
        const nextDate = new Date(year, month, nextDay);
        const iso = this.formatDateIso(nextDate);
        cells.push({
          key: `next-${nextDay}`,
          day: nextDay,
          value: iso,
          currentMonth: false,
          selected: iso === selectedStr,
          today: iso === todayStr
        });
        nextDay++;
      }
      return cells;
    }
  },
  watch: {
    activeTabId() {
      const at = this.favoriteTabs.find(t => t.id === this.activeTabId);
      this.favorites = at ? at.items : [];
      this.normalizeFavoritesOrder();
      try {
        localStorage.setItem('favoriteTabs_activeId', this.activeTabId);
      } catch (e) {}
      this.$nextTick(() => {
        try { this.sortedFavorites.forEach(f => this.ensureFavThumb(f)); } catch (e) {}
      });
    }
  },
  async mounted() {
    try { await ensureUserDataHydrated(); } catch (e) {}
    this.loadFavorites();
    this.$nextTick(() => {
      try { this.sortedFavorites.forEach(f => this.ensureFavThumb(f)); } catch (e) {}
      this.scrollActiveTabIntoCenter();
    });

    try {
      this._onHardwareBack = (evt) => {
        try { evt && evt.preventDefault && evt.preventDefault(); } catch (e) {}
        this.goBack();
      };
      window.addEventListener('hardware-back', this._onHardwareBack);
    } catch (e) {}
  },
  beforeUnmount() {
    this.closeFavoritesContextMenu();
    this.closeFavoriteDateModal();
    if (this.clickGuardTimer) clearTimeout(this.clickGuardTimer);
    if (this.recentlyMovedTimer) clearTimeout(this.recentlyMovedTimer);
    if (this.favoritesContextMenuLockTimer) clearTimeout(this.favoritesContextMenuLockTimer);
    if (this._onHardwareBack) {
      try { window.removeEventListener('hardware-back', this._onHardwareBack); } catch (e) {}
    }
  },
  methods: {
    goBack() {
      this.$router.push('/');
    },
    uid() {
      return 't' + Math.random().toString(36).slice(2, 9);
    },
    makeFavoriteKey(f) {
      return f ? `${String(f.country || '')}_${String(f.id)}` : '';
    },
    thumbKey(f) {
      return f ? `${String(f.country || '')}-${String(f.id)}` : '';
    },
    getFavoritesStorageKey() {
      return 'favoriteTabs_all';
    },
    loadFavorites() {
      try {
        const tabsKey = this.getFavoritesStorageKey();
        const rawTabs = localStorage.getItem(tabsKey);
        if (rawTabs) {
          const parsed = JSON.parse(rawTabs) || [];
          this.favoriteTabs = Array.isArray(parsed) ? parsed : [];
        } else {
          const old = localStorage.getItem('favorites_all');
          const items = old ? (JSON.parse(old) || []) : [];
          const firstTab = {
            id: this.uid(),
            name: '新的收藏',
            items: Array.isArray(items) ? items : [],
            order: 1,
          };
          this.favoriteTabs = [firstTab];
        }
        this.normalizeTabsOrder();
        if (!this.favoriteTabs.length) {
          this.favoriteTabs = [{ id: this.uid(), name: '新的收藏', items: [], order: 1 }];
        }

        let savedActive = null;
        try { savedActive = localStorage.getItem('favoriteTabs_activeId'); } catch (e) {}
        if (savedActive && this.favoriteTabs.find(t => t.id === savedActive)) {
          this.activeTabId = savedActive;
        } else if (!this.activeTabId || !this.favoriteTabs.find(t => t.id === this.activeTabId)) {
          this.activeTabId = this.favoriteTabs[0].id;
        }

        const at = this.favoriteTabs.find(t => t.id === this.activeTabId);
        this.favorites = at ? at.items : [];
        this.normalizeFavoritesOrder();
      } catch (e) {
        this.favoriteTabs = [{ id: this.uid(), name: '新的收藏', items: [], order: 1 }];
        this.activeTabId = this.favoriteTabs[0].id;
        this.favorites = this.favoriteTabs[0].items;
      }
    },
    saveFavorites() {
      const key = this.getFavoritesStorageKey();
      try {
        if ((!this.favoriteTabs || this.favoriteTabs.length === 0) && localStorage.getItem(key)) {
          return;
        }
        const next = JSON.stringify(this.favoriteTabs || []);
        localStorage.setItem(key, next);
        try {
          if (this.activeTabId) localStorage.setItem('favoriteTabs_activeId', this.activeTabId);
        } catch (e) {}
        try { invalidateAttractionMapCache('favorites:save'); } catch (e) {}
        try { queueUserDataSync(); } catch (e) {}
      } catch (e) {}
    },
    normalizeTabsOrder() {
      this.sortedTabs.forEach((tab, index) => {
        tab.order = index + 1;
      });
    },
    normalizeFavoritesOrder() {
      (this.favorites || []).forEach((fav, index) => {
        fav.order = index + 1;
      });
    },
    getNonPendingIndex(idx) {
      let count = 0;
      const list = this.sortedFavorites;
      for (let i = 0; i <= idx && i < list.length; i++) {
        if (!list[i].pending) count++;
      }
      return count;
    },
    getRatingColor(rating) {
      const raw = typeof rating === 'number' ? rating : parseFloat(String(rating || '').replace('%', '').trim());
      const ratingValue = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
      if (ratingValue <= 50) return '#ff3b30';
      if (ratingValue >= 100) return '#34c759';
      const x = (ratingValue - 50) / 50;
      const red = Math.round(255 * Math.max(0, 1 - 10 * x));
      const green = Math.round(255 * x);
      return `rgb(${red}, ${green}, 0)`;
    },

    // 缩略图获取
    async ensureFavThumb(f) {
      if (!f || !f.id) return;
      const key = this.thumbKey(f);
      if (this.favThumbs[key]) return;
      const isCustom = String(f.country) === 'custom';
      if (isCustom) {
        try {
          const ca = findCustomAttractionById(f.id);
          const imageKey = ca && ca.images && ca.images.main ? `${f.id}:main` : '';
          let url = '';
          if (imageKey) url = await getCustomImageUrl(imageKey);
          if (!url) url = await getCustomImageUrl(`${f.id}:main`);
          if (url) {
            this.favThumbs[key] = url;
            return;
          }
        } catch (e) {}
      }
      if (f.image1) {
        this.favThumbs[key] = f.image1;
      }
    },

    // 选项卡操作
    onTabClick(tab, index, evt) {
      if (this.activeTabId === tab.id) {
        this.startEditTab(tab);
      } else {
        this.setActiveTab(tab.id);
      }
    },
    setActiveTab(id) {
      if (this.activeTabId === id) return;
      this.activeTabId = id;
      try { localStorage.setItem('favoriteTabs_activeId', id); } catch (e) {}
      const at = this.favoriteTabs.find(t => t.id === this.activeTabId);
      this.favorites = at ? at.items : [];
      this.normalizeFavoritesOrder();
      this.scrollActiveTabIntoCenter();
    },
    scrollActiveTabIntoCenter() {
      this.$nextTick(() => {
        try {
          const tabs = this.$refs.favTabs;
          if (!tabs) return;
          const activeEl = tabs.querySelector('.fav-tab.active');
          if (activeEl) {
            const tabsRect = tabs.getBoundingClientRect();
            const activeRect = activeEl.getBoundingClientRect();
            const offset = (activeRect.left + activeRect.width / 2) - (tabsRect.left + tabsRect.width / 2);
            tabs.scrollBy({ left: offset, behavior: 'smooth' });
          }
        } catch (e) {}
      });
    },
    startEditTab(tab) {
      if (this.tabDragging) return;
      this.editingTabId = tab.id;
      this.editingTabName = tab.name;
      this.$nextTick(() => {
        const refName = 'tabEdit_' + tab.id;
        const el = this.$refs[refName] && (Array.isArray(this.$refs[refName]) ? this.$refs[refName][0] : this.$refs[refName]);
        if (el) {
          el.textContent = tab.name;
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
    },
    onTabCompositionEnd(tab, evt) {
      this.tabEditingComposing = false;
      this.editingTabName = (evt && evt.target && evt.target.textContent) || '';
    },
    onTabNameInput(tab, evt) {
      if (this.tabEditingComposing) return;
      this.editingTabName = (evt && evt.target && evt.target.textContent) || '';
    },
    onTabEditEnter(evt) {
      this.finishEditTab(true);
    },
    onTabEditEsc(evt) {
      this.finishEditTab(false);
    },
    finishEditTab(commit) {
      if (!this.editingTabId) return;
      const tab = this.favoriteTabs.find(t => t.id === this.editingTabId);
      if (commit && tab) {
        const refName = 'tabEdit_' + tab.id;
        const el = this.$refs[refName] && (Array.isArray(this.$refs[refName]) ? this.$refs[refName][0] : this.$refs[refName]);
        const nameRaw = el ? (el.textContent || '') : this.editingTabName;
        const name = (nameRaw || '').trim();
        if (name && name !== tab.name) {
          tab.name = name;
          this.saveFavorites();
        }
      }
      this.editingTabId = null;
      this.editingTabName = '';
      this.tabEditingComposing = false;
    },
    addNewTab() {
      const maxOrder = this.favoriteTabs.reduce((m, t) => Math.max(m, t.order || 0), 0);
      const tab = { id: this.uid(), name: '新的收藏', items: [], order: maxOrder + 1 };
      this.favoriteTabs.push(tab);
      this.normalizeTabsOrder();
      this.saveFavorites();
      this.setActiveTab(tab.id);
      this.scrollActiveTabIntoCenter();
    },

    // 选项卡拖拽
    onTabPressStart(index, evt) {
      if (evt && typeof evt.button === 'number' && evt.button !== 0) return;
      if (this.editingTabId) return;
      const e = evt.touches ? evt.touches[0] : evt;
      const startX = e.clientX;
      const startY = e.clientY;
      let triggered = false;
      const timer = setTimeout(() => {
        triggered = true;
        this.beginTabDrag(index, startX, startY);
      }, 350);
      const cancel = () => {
        clearTimeout(timer);
        window.removeEventListener('mouseup', cancel, true);
        window.removeEventListener('touchend', cancel, true);
        window.removeEventListener('mousemove', onMove, true);
        window.removeEventListener('touchmove', onMove, true);
      };
      const onMove = (ev) => {
        const p = ev.touches ? ev.touches[0] : ev;
        if (!p) return;
        const dx = Math.abs(p.clientX - startX);
        const dy = Math.abs(p.clientY - startY);
        if (dx > 10 || dy > 10) cancel();
      };
      window.addEventListener('mouseup', cancel, true);
      window.addEventListener('touchend', cancel, true);
      window.addEventListener('mousemove', onMove, true);
      window.addEventListener('touchmove', onMove, true);
    },
    beginTabDrag(index, startX, startY) {
      this.tabDragging = true;
      this.tabDragIndex = index;
      this.tabPlaceholderIndex = index;
      this.tabDragItem = this.sortedTabs[index];
      const tabs = this.$refs.favTabs;
      const tabEls = tabs ? Array.from(tabs.querySelectorAll('.fav-tab')) : [];
      this.tabFixedWidths = tabEls.map(el => Math.round(el.getBoundingClientRect().width));
      const dragEl = tabEls[index];
      const rect = dragEl ? dragEl.getBoundingClientRect() : null;
      this.tabOffsetX = rect ? (startX - rect.left) : 0;
      this.tabGhostLeft = startX - this.tabOffsetX;
      this.tabGhostTop = rect ? rect.top : startY - 14;
      this.tabGhostWidth = rect ? rect.width : 50;
      this.tabGhostHeight = rect ? rect.height : 28;
      this.attachTabDragListeners();
    },
    attachTabDragListeners() {
      window.addEventListener('mousemove', this.onTabDragMove, true);
      window.addEventListener('mouseup', this.finishTabDrag, true);
      window.addEventListener('touchmove', this.onTabDragMove, { passive: false, capture: true });
      window.addEventListener('touchend', this.finishTabDrag, true);
    },
    detachTabDragListeners() {
      window.removeEventListener('mousemove', this.onTabDragMove, true);
      window.removeEventListener('mouseup', this.finishTabDrag, true);
      window.removeEventListener('touchmove', this.onTabDragMove, { capture: true });
      window.removeEventListener('touchend', this.finishTabDrag, true);
    },
    onTabDragMove(evt) {
      if (!this.tabDragging) return;
      if (evt.cancelable) evt.preventDefault();
      const p = evt.touches ? evt.touches[0] : evt;
      if (!p) return;
      this.tabGhostLeft = p.clientX - this.tabOffsetX;
      const tabs = this.$refs.favTabs;
      if (!tabs) return;
      const tabEls = Array.from(tabs.querySelectorAll('.fav-tab'));
      let target = this.sortedTabs.length;
      for (let i = 0; i < tabEls.length; i++) {
        const r = tabEls[i].getBoundingClientRect();
        if (p.clientX < r.left + r.width / 2) {
          target = i;
          break;
        }
      }
      this.tabPlaceholderIndex = target;
    },
    finishTabDrag(evt) {
      if (!this.tabDragging) return;
      this.detachTabDragListeners();
      const from = this.tabDragIndex;
      let to = this.tabPlaceholderIndex;
      if (from !== -1 && to !== -1) {
        if (from < to) to -= 1;
        if (from !== to) {
          const ordered = [...this.sortedTabs];
          const [moved] = ordered.splice(from, 1);
          ordered.splice(to, 0, moved);
          ordered.forEach((t, i) => (t.order = i + 1));
          this.favoriteTabs = ordered;
          this.saveFavorites();
        }
      }
      this.tabDragging = false;
      this.tabDragIndex = -1;
      this.tabPlaceholderIndex = -1;
      this.tabDragItem = null;
    },
    getDraggedTabWidth() {
      return (this.tabFixedWidths && this.tabFixedWidths[this.tabDragIndex]) || 60;
    },
    onTabsWheel(evt) {
      const tabs = this.$refs.favTabs;
      if (tabs) tabs.scrollLeft += evt.deltaY || evt.deltaX;
    },
    onTabsTouchMove() {},

    // 删除选项卡
    confirmDeleteTab(id) {
      this.tabDeleteTargetId = id;
      this.tabDeleteConfirmVisible = true;
    },
    cancelDeleteTab() {
      this.tabDeleteTargetId = null;
      this.tabDeleteConfirmVisible = false;
    },
    performDeleteTab() {
      const id = this.tabDeleteTargetId;
      if (!id) return;
      const idx = this.favoriteTabs.findIndex(t => t.id === id);
      if (idx >= 0) {
        this.favoriteTabs.splice(idx, 1);
        this.normalizeTabsOrder();
        if (!this.favoriteTabs.length) {
          this.favoriteTabs = [{ id: this.uid(), name: '新的收藏', items: [], order: 1 }];
        }
        if (this.activeTabId === id) {
          this.activeTabId = this.favoriteTabs[0].id;
        }
        this.saveFavorites();
      }
      this.cancelDeleteTab();
    },

    // 点击收藏项
    handleMenuItemClick(f, idx, evt) {
      if (this.favoritesContextMenuVisible || this.favoritesContextMenuInteractionLock) {
        if (evt && evt.preventDefault) evt.preventDefault();
        if (evt && evt.stopPropagation) evt.stopPropagation();
        this.closeFavoritesContextMenu({ keepLock: true, unlockDelay: 250 });
        return;
      }
      this.closeFavoritesContextMenu();
      if (this.dragging || this.clickGuard) return;
      try {
        const color = this.getRatingColor(f.rating);
        localStorage.setItem('selectedAttractionRatingColor', color);
      } catch (e) {}

      // 记录返回目标为当前独立收藏页路径及当前活动分组
      try {
        localStorage.setItem('favoriteTabs_activeId', this.activeTabId);
        localStorage.setItem('lastAttractionsRoute', '/favorites');
      } catch (e) {}

      const all = this.sortedFavorites || [];
      let nav = [];
      let newIdx = 0;
      if (f && !f.pending) {
        const active = all.filter(x => !x.pending).map(x => ({ country: x.country, id: x.id }));
        nav = active;
        const findIdx = active.findIndex(x => String(x.id) === String(f.id) && String(x.country || '') === String(f.country || ''));
        newIdx = findIdx >= 0 ? findIdx : 0;
      } else {
        nav = [{ country: f.country, id: f.id }];
        newIdx = 0;
      }
      localStorage.setItem('favNav', JSON.stringify(nav));
      localStorage.setItem('favIndex', String(newIdx));
      this.setClickGuard();
      const __q = (f && f.pending) ? '?from=favorites&pendingNav=1' : '?from=favorites';
      this.$router.push(`/attraction/${f.country}/${f.id}${__q}`);
    },
    setClickGuard() {
      this.clickGuard = true;
      if (this.clickGuardTimer) clearTimeout(this.clickGuardTimer);
      this.clickGuardTimer = setTimeout(() => {
        this.clickGuard = false;
        this.clickGuardTimer = null;
      }, 400);
    },

    // 收藏项触摸与滑动操作
    onFavTouchStart(f, idx, evt) {
      if (!evt || !evt.touches || !evt.touches[0]) return;
      const t = evt.touches[0];
      this.favTouchTracking = true;
      this.favTouchStartX = t.clientX;
      this.favTouchStartY = t.clientY;
      this.favTouchIdentifier = t.identifier;
      this.favSwipeItemId = String(f.id);
      this.favRightSwipeItemId = String(f.id);
    },
    onFavTouchMove(evt) {
      if (!this.favTouchTracking || !evt.touches) return;
      const t = Array.from(evt.touches).find(x => x.identifier === this.favTouchIdentifier);
      if (!t) return;
      const dx = t.clientX - this.favTouchStartX;
      const dy = t.clientY - this.favTouchStartY;
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 10) {
        if (dx > 0) {
          // 右滑待定
          this.favSwipeOffsetX = Math.min(60, dx);
          this.favRightActionId = this.favSwipeItemId;
        } else {
          // 左滑删除
          this.favSwipeOffsetX = Math.max(-60, dx);
          this.favActionId = this.favSwipeItemId;
        }
      }
    },
    onFavTouchEnd(f, idx, evt) {
      this.favTouchTracking = false;
      if (this.favSwipeOffsetX > 35) {
        this.favRightActionId = String(f.id);
        this.favActionId = null;
      } else if (this.favSwipeOffsetX < -35) {
        this.favActionId = String(f.id);
        this.favRightActionId = null;
      } else {
        this.favActionId = null;
        this.favRightActionId = null;
        this.favSwipeOffsetX = 0;
      }
    },
    isFavActionsVisible(f) {
      return f && this.favActionId === String(f.id);
    },
    isFavRightActionsVisible(f) {
      return f && this.favRightActionId === String(f.id);
    },
    getFavSwipeOffset(f) {
      if (!f) return 0;
      const id = String(f.id);
      if (this.favSwipeItemId === id && this.favTouchTracking) return this.favSwipeOffsetX;
      if (this.favRightActionId === id) return 56;
      if (this.favActionId === id) return -56;
      return 0;
    },
    togglePending(f) {
      f.pending = !f.pending;
      this.favRightActionId = null;
      this.favSwipeOffsetX = 0;
      this.normalizeFavoritesOrder();
      this.saveFavorites();
    },
    removeFavorite(f) {
      this.itemDeleteTarget = f;
      this.itemDeleteConfirmVisible = true;
    },
    cancelDeleteItem() {
      this.itemDeleteTarget = null;
      this.itemDeleteConfirmVisible = false;
    },
    performDeleteItem() {
      const f = this.itemDeleteTarget;
      if (!f) return;
      const idx = this.favorites.findIndex(it => String(it.id) === String(f.id) && String(it.country || '') === String(f.country || ''));
      if (idx >= 0) {
        this.favorites.splice(idx, 1);
        this.normalizeFavoritesOrder();
        this.saveFavorites();
        if (String(f.country) === 'custom') {
          try {
            deleteCustomAttraction(f.id);
            deleteCustomImagesForId(f.id);
          } catch (e) {}
        }
      }
      this.favActionId = null;
      this.favSwipeOffsetX = 0;
      this.cancelDeleteItem();
    },

    // 拖拽重排
    onFavoritesNodeMouseDown(node, evt) {
      if (node.type !== 'item') return;
      this.startMenuItemPress(node.index, evt);
    },
    onFavoritesNodeTouchStart(node, evt) {
      if (node.type !== 'item') return;
      this.onFavTouchStart(node.f, node.index, evt);
      this.startMenuItemPress(node.index, evt);
    },
    onFavoritesNodeTouchMove(node, evt) {
      if (node.type !== 'item') return;
      this.onFavTouchMove(evt);
    },
    onFavoritesNodeTouchEnd(node, evt) {
      if (node.type !== 'item') return;
      this.onFavTouchEnd(node.f, node.index, evt);
    },
    onFavoritesNodeClick(node, evt) {
      if (node.type !== 'item') return;
      if (this.isFavoriteDateEvent(evt)) return;
      if (Date.now() < Number(this.favoriteDateClickLockUntil || 0)) return;
      this.handleMenuItemClick(node.f, node.index, evt);
    },
    onFavoritesNodeContextMenu(node, evt) {
      if (node.type !== 'item') return;
      if (evt && evt.preventDefault) evt.preventDefault();
      this.onFavoriteContextMenu(node.f, node.index, evt);
    },
    startMenuItemPress(index, evt) {
      if (evt && typeof evt.button === 'number' && evt.button !== 0) return;
      const e = evt.touches ? evt.touches[0] : evt;
      const startX = e.clientX;
      const startY = e.clientY;
      const el = evt.currentTarget;
      const rect = el ? el.getBoundingClientRect() : null;
      let triggered = false;
      const timer = setTimeout(() => {
        triggered = true;
        this.beginDrag(index, startX, startY, rect);
      }, 400);
      const cancel = () => {
        clearTimeout(timer);
        window.removeEventListener('mouseup', cancel, true);
        window.removeEventListener('touchend', cancel, true);
        window.removeEventListener('mousemove', onMove, true);
        window.removeEventListener('touchmove', onMove, true);
      };
      const onMove = (ev) => {
        const p = ev.touches ? ev.touches[0] : ev;
        if (!p) return;
        const dx = Math.abs(p.clientX - startX);
        const dy = Math.abs(p.clientY - startY);
        if (dx > 8 || dy > 8) cancel();
      };
      window.addEventListener('mouseup', cancel, true);
      window.addEventListener('touchend', cancel, true);
      window.addEventListener('mousemove', onMove, true);
      window.addEventListener('touchmove', onMove, true);
    },
    beginDrag(index, startClientX, startClientY, originRect) {
      this.dragging = true;
      this.dragIndex = index;
      this.placeholderIndex = index;
      this.dragItem = this.sortedFavorites[index];
      this.dragY = startClientY;
      this.dragOffsetY = originRect ? (startClientY - originRect.top) : 24;
      this.dragLeft = originRect ? originRect.left : 20;
      this.dragWidth = originRect ? originRect.width : 320;

      const list = this.$refs.favoritesList && this.$refs.favoritesList.$el;
      if (list) {
        const itemEls = Array.from(list.querySelectorAll('.favorites-item'));
        this.itemTops = itemEls.map(el => {
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2;
        });
      }
      this.attachDragListeners();
    },
    attachDragListeners() {
      window.addEventListener('mousemove', this.onDragMove, true);
      window.addEventListener('mouseup', this.finishDrag, true);
      window.addEventListener('touchmove', this.onDragMove, { passive: false, capture: true });
      window.addEventListener('touchend', this.finishDrag, true);
    },
    detachDragListeners() {
      window.removeEventListener('mousemove', this.onDragMove, true);
      window.removeEventListener('mouseup', this.finishDrag, true);
      window.removeEventListener('touchmove', this.onDragMove, { capture: true });
      window.removeEventListener('touchend', this.finishDrag, true);
    },
    onDragMove(evt) {
      if (!this.dragging) return;
      if (evt.cancelable) evt.preventDefault();
      const p = evt.touches ? evt.touches[0] : evt;
      if (!p) return;
      this.dragY = p.clientY;
      const y = p.clientY;
      let target = this.itemTops.length;
      for (let i = 0; i < this.itemTops.length; i++) {
        if (y < this.itemTops[i]) {
          target = i;
          break;
        }
      }
      this.placeholderIndex = target;
    },
    finishDrag(evt) {
      if (!this.dragging) return;
      this.detachDragListeners();
      const from = this.dragIndex;
      let to = this.placeholderIndex;
      if (from !== -1 && to !== -1) {
        if (from < to) to -= 1;
        if (from !== to) {
          const ordered = [...this.sortedFavorites];
          const [moved] = ordered.splice(from, 1);
          ordered.splice(to, 0, moved);
          ordered.forEach((it, i) => (it.order = i + 1));
          this.favorites = ordered;
          const at = this.favoriteTabs.find(t => t.id === this.activeTabId);
          if (at) at.items = ordered;
          this.saveFavorites();
          this.recentlyMovedId = moved ? moved.id : null;
          if (this.recentlyMovedTimer) clearTimeout(this.recentlyMovedTimer);
          this.recentlyMovedTimer = setTimeout(() => {
            this.recentlyMovedId = null;
          }, 800);
        }
      }
      this.dragging = false;
      this.dragIndex = -1;
      this.placeholderIndex = -1;
      this.dragItem = null;
    },

    // 上下文菜单
    onFavoriteContextMenu(f, idx, evt) {
      this.favoritesContextMenuTarget = f;
      this.favoritesContextMenuVisible = true;
      const x = Math.min(window.innerWidth - 120, evt.clientX || 50);
      const y = Math.min(window.innerHeight - 90, evt.clientY || 50);
      this.favoritesContextMenuStyle = { left: `${x}px`, top: `${y}px` };
      this.attachContextMenuGuards();
    },
    attachContextMenuGuards() {
      this.favoritesContextMenuOutsideHandler = (e) => {
        const menu = this.$refs.favoritesContextMenu;
        if (menu && !menu.contains(e.target)) {
          this.closeFavoritesContextMenu({ keepLock: true, unlockDelay: 200 });
        }
      };
      document.addEventListener('mousedown', this.favoritesContextMenuOutsideHandler, true);
      document.addEventListener('touchstart', this.favoritesContextMenuOutsideHandler, true);
    },
    closeFavoritesContextMenu(options = {}) {
      if (!this.favoritesContextMenuVisible) return;
      this.favoritesContextMenuVisible = false;
      this.favoritesContextMenuTarget = null;
      if (this.favoritesContextMenuOutsideHandler) {
        document.removeEventListener('mousedown', this.favoritesContextMenuOutsideHandler, true);
        document.removeEventListener('touchstart', this.favoritesContextMenuOutsideHandler, true);
        this.favoritesContextMenuOutsideHandler = null;
      }
    },
    onFavoritesContextMenuPending() {
      if (this.favoritesContextMenuTarget) {
        this.togglePending(this.favoritesContextMenuTarget);
      }
      this.closeFavoritesContextMenu();
    },
    onFavoritesContextMenuRemove() {
      if (this.favoritesContextMenuTarget) {
        this.removeFavorite(this.favoritesContextMenuTarget);
      }
      this.closeFavoritesContextMenu();
    },

    // 日期处理
    normalizeFavoriteDate(val) {
      return normalizeFavoriteDateValue(val);
    },
    hasFavoriteDate(item) {
      return !!this.normalizeFavoriteDate(item && item.favoriteDate);
    },
    getFavoriteDateYear(item) {
      const d = this.normalizeFavoriteDate(item && item.favoriteDate);
      return d ? d.slice(0, 4) : '';
    },
    getFavoriteDateMonthDay(item) {
      const d = this.normalizeFavoriteDate(item && item.favoriteDate);
      return d ? `${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日` : '';
    },
    getFavoriteDateWeekday(item) {
      return getFavoriteDateWeekdayLabel(item && item.favoriteDate);
    },
    isFavoriteDateFlashing(item) {
      const key = item ? `${item.country}_${item.id}` : '';
      return !!this.favoriteDateFlashStates[key];
    },
    triggerFavoriteDateFlash(item) {
      if (!item) return;
      const key = `${item.country}_${item.id}`;
      this.favoriteDateFlashStates[key] = true;
      if (this.favoriteDateFlashTimers[key]) clearTimeout(this.favoriteDateFlashTimers[key]);
      this.favoriteDateFlashTimers[key] = setTimeout(() => {
        delete this.favoriteDateFlashStates[key];
      }, 800);
    },
    openFavoriteDatePicker(item) {
      this.favoriteDateClickLockUntil = Date.now() + 600;
      this.favoriteDateModalTarget = item;
      const cur = this.normalizeFavoriteDate(item.favoriteDate);
      this.favoriteDateModalValue = cur || '';
      const base = cur ? new Date(cur) : new Date();
      this.favoriteDateModalYear = base.getFullYear();
      this.favoriteDateModalMonth = base.getMonth() + 1;
      this.showFavoriteDateModal = true;
    },
    closeFavoriteDateModal() {
      this.showFavoriteDateModal = false;
      this.favoriteDateModalTarget = null;
    },
    shiftFavoriteDateModalMonth(delta) {
      let m = this.favoriteDateModalMonth + delta;
      let y = this.favoriteDateModalYear;
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      this.favoriteDateModalMonth = m;
      this.favoriteDateModalYear = y;
    },
    selectFavoriteDateCalendarCell(cell) {
      if (!cell || !cell.value || !this.favoriteDateModalTarget) return;
      this.favoriteDateModalTarget.favoriteDate = cell.value;
      this.saveFavorites();
      this.triggerFavoriteDateFlash(this.favoriteDateModalTarget);
      this.closeFavoriteDateModal();
    },
    clearFavoriteDateModal() {
      if (this.favoriteDateModalTarget) {
        delete this.favoriteDateModalTarget.favoriteDate;
        this.saveFavorites();
      }
      this.closeFavoriteDateModal();
    },
    setFavoriteDateModalToday() {
      const today = this.formatDateIso(new Date());
      if (this.favoriteDateModalTarget) {
        this.favoriteDateModalTarget.favoriteDate = today;
        this.saveFavorites();
        this.triggerFavoriteDateFlash(this.favoriteDateModalTarget);
      }
      this.closeFavoriteDateModal();
    },
    isFavoriteDateEvent(evt) {
      const t = evt && evt.target;
      return !!(t && (t.closest('.fav-date-trigger') || t.closest('.fav-date-native-input')));
    },
    getFavoriteDateInputRefKey(item) {
      return item ? `favDateInput_${item.country}_${item.id}` : '';
    },
    onFavoriteDateNativeInput(item, evt) {
      const val = evt && evt.target && evt.target.value;
      if (item) {
        item.favoriteDate = this.normalizeFavoriteDate(val);
        this.saveFavorites();
        this.triggerFavoriteDateFlash(item);
      }
    },
    formatDateParts(y, m, d) {
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    },
    formatDateIso(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },

    // 自创景点新增回调
    onCustomCreated(attraction) {
      if (!attraction) return;
      const entry = {
        id: attraction.id,
        name: attraction.name,
        region: attraction.region,
        county: attraction.county,
        country: 'custom',
        order: (this.favorites.length + 1)
      };
      this.favorites.push(entry);
      this.saveFavorites();
      this.$nextTick(() => {
        this.ensureFavThumb(entry);
      });
    },

    // 导入 / 导出
    onImportClick() {
      try {
        const input = this.$refs.importFileInput;
        if (!input) return;
        if (typeof input.showPicker === 'function') {
          try { input.showPicker(); return; } catch (e) {}
        }
        input.click();
      } catch (e) {}
    },
    async handleImportFile(evt) {
      try {
        const file = evt && evt.target && evt.target.files && evt.target.files[0];
        if (!file) return;
        let text = '';
        try {
          text = await file.text();
        } catch (e) {
          this.importPasteText = '';
          this.showImportPaste = true;
          return;
        }
        const data = JSON.parse(text);
        await this.doImportFromParsedData(data);
        if (evt && evt.target) evt.target.value = '';
      } catch (e) {
        if (evt && evt.target) evt.target.value = '';
      }
    },
    async doImportFromParsedData(data) {
      if (data && data.type === 'favorites-export-multi' && Array.isArray(data.tabs)) {
        let baseOrder = this.favoriteTabs.reduce((m, t) => Math.max(m, t.order || 0), 0) + 1;
        for (const tab of data.tabs) {
          const newTab = { id: this.uid(), name: tab.tabName || '导入的收藏', items: [], order: baseOrder++ };
          const items = [];
          for (const entry of (tab.items || [])) {
            if (entry.kind === 'custom' && entry.data) {
              const custom = entry.data;
              const existed = findCustomAttractionById(custom.id);
              if (existed && JSON.stringify(existed) !== JSON.stringify(custom)) {
                custom.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
              }
              const allRaw = localStorage.getItem('customAttractions');
              const all = allRaw ? JSON.parse(allRaw) : [];
              all.push({ ...custom, isImported: true });
              saveAllCustomAttractions(all);
              items.push({ id: custom.id, name: custom.name, region: custom.region, county: custom.county, country: 'custom', pending: !!entry.pending, favoriteDate: entry.favoriteDate || '' });
            } else if (entry.kind === 'ref' && entry.data) {
              items.push({ ...entry.data, pending: !!entry.pending, favoriteDate: entry.favoriteDate || '' });
            }
          }
          items.forEach((it, idx) => (it.order = idx + 1));
          newTab.items = items;
          this.favoriteTabs.push(newTab);
        }
        this.normalizeTabsOrder();
        this.saveFavorites();
        this.setActiveTab(this.favoriteTabs[this.favoriteTabs.length - 1].id);
        return;
      }

      if (data && data.type === 'favorites-export' && Array.isArray(data.items)) {
        const baseOrder = this.favoriteTabs.reduce((m, t) => Math.max(m, t.order || 0), 0) + 1;
        const newTab = { id: this.uid(), name: data.tabName || '导入的收藏', items: [], order: baseOrder };
        const items = [];
        for (const entry of data.items) {
          if (entry.kind === 'custom' && entry.data) {
            const custom = entry.data;
            const allRaw = localStorage.getItem('customAttractions');
            const all = allRaw ? JSON.parse(allRaw) : [];
            all.push({ ...custom, isImported: true });
            saveAllCustomAttractions(all);
            items.push({ id: custom.id, name: custom.name, region: custom.region, county: custom.county, country: 'custom', pending: !!entry.pending, favoriteDate: entry.favoriteDate || '' });
          } else if (entry.kind === 'ref' && entry.data) {
            items.push({ ...entry.data, pending: !!entry.pending, favoriteDate: entry.favoriteDate || '' });
          }
        }
        items.forEach((it, idx) => (it.order = idx + 1));
        newTab.items = items;
        this.favoriteTabs.push(newTab);
        this.normalizeTabsOrder();
        this.saveFavorites();
        this.setActiveTab(newTab.id);
      }
    },
    cancelImportPaste() {
      this.showImportPaste = false;
      this.importPasteText = '';
    },
    async confirmImportPaste() {
      try {
        const data = JSON.parse(this.importPasteText);
        await this.doImportFromParsedData(data);
        this.cancelImportPaste();
      } catch (e) {
        alert('解析粘贴的 JSON 失败，请检查格式。');
      }
    },
    promptExportFavorites() {
      const tabsCount = this.favoriteTabs.length;
      if (tabsCount <= 1) {
        this.exportActiveFavorites();
      } else {
        this.showExportChoice = true;
      }
    },
    closeExportChoice() {
      this.showExportChoice = false;
    },
    exportChoiceCurrent() {
      this.showExportChoice = false;
      this.exportActiveFavorites();
    },
    exportChoiceAll() {
      this.showExportChoice = false;
      this.exportAllFavorites();
    },
    async exportActiveFavorites() {
      if (this.exporting) return;
      this.exporting = true;
      try {
        const active = this.favoriteTabs.find(t => t.id === this.activeTabId);
        const items = Array.isArray(this.favorites) ? [...this.favorites] : [];
        this.exportTotal = items.length;
        this.exportProgress = 0;
        const packedItems = [];
        for (const it of items) {
          if (String(it.country) === 'custom') {
            const full = findCustomAttractionById(it.id);
            packedItems.push({ kind: 'custom', pending: !!it.pending, data: full, favoriteDate: it.favoriteDate || '' });
          } else {
            packedItems.push({ kind: 'ref', pending: !!it.pending, data: { id: it.id, name: it.name, region: it.region, county: it.county, country: it.country, rating: it.rating }, favoriteDate: it.favoriteDate || '' });
          }
          this.exportProgress++;
        }
        const payload = {
          version: 1,
          type: 'favorites-export',
          tabName: active ? active.name : '收藏',
          exportedAt: new Date().toISOString(),
          items: packedItems
        };
        await this.saveExportJson(payload, (payload.tabName || '收藏') + '_favorites.json');
      } catch (e) {
        alert('导出失败，请重试。');
      } finally {
        this.exporting = false;
      }
    },
    async exportAllFavorites() {
      if (this.exporting) return;
      this.exporting = true;
      try {
        const outTabs = [];
        for (const t of this.favoriteTabs) {
          const packedItems = [];
          for (const it of (t.items || [])) {
            if (String(it.country) === 'custom') {
              const full = findCustomAttractionById(it.id);
              packedItems.push({ kind: 'custom', pending: !!it.pending, data: full, favoriteDate: it.favoriteDate || '' });
            } else {
              packedItems.push({ kind: 'ref', pending: !!it.pending, data: { id: it.id, name: it.name, region: it.region, county: it.county, country: it.country, rating: it.rating }, favoriteDate: it.favoriteDate || '' });
            }
          }
          outTabs.push({ tabName: t.name, items: packedItems });
        }
        const payload = {
          version: 1,
          type: 'favorites-export-multi',
          exportedAt: new Date().toISOString(),
          tabs: outTabs
        };
        await this.saveExportJson(payload, 'all_favorites.json');
      } catch (e) {
        alert('导出全部收藏失败，请重试。');
      } finally {
        this.exporting = false;
      }
    },
    async saveExportJson(payload, defaultFileName) {
      const jsonText = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
      const fileName = defaultFileName.replace(/[\\/]+/g, '_');

      try {
        if (Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
          const dir = Directory.Documents;
          await Filesystem.writeFile({
            path: `favorites_exports/${fileName}`,
            data: jsonText,
            directory: dir,
            encoding: Encoding.UTF8,
            recursive: true
          });
          alert(`已保存到文档目录：${fileName}`);
          return;
        }
      } catch (e) {}

      try {
        if (typeof File !== 'undefined' && navigator && typeof navigator.canShare === 'function') {
          const file = new File([blob], fileName, { type: 'application/json' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: fileName });
            return;
          }
        }
      } catch (e) {}

      try {
        const a = document.createElement('a');
        if ('download' in a) {
          const url = URL.createObjectURL(blob);
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {}
          }, 100);
          return;
        }
      } catch (e) {}

      this.openExportFallback(jsonText, fileName);
    },
    openExportFallback(jsonText, fileName) {
      this.exportJsonText = jsonText || '';
      this.exportFileName = fileName || 'favorites.json';
      this.exportDataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(this.exportJsonText);
      this.showExportModal = true;
    },
    closeExportFallback() {
      this.showExportModal = false;
    },
    async copyExportJson() {
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(this.exportJsonText);
          alert('已复制内容到剪贴板');
        }
      } catch (e) {}
    },
    openExportDataUrl() {
      try { window.open(this.exportDataUrl, '_blank', 'noopener'); } catch (e) {}
    },

    // 清空 / 删除收藏
    promptClearFavorites() {
      const id = this.activeTabId;
      if (!id) return;
      this.confirmDeleteTab(id);
    }
  }
};
</script>

<style scoped>
.favorites-page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px 32px 100px;
  box-sizing: border-box;
  background-color: #f5f5f7;
  width: 100%;
}

.page-header {
  text-align: center;
  margin-bottom: 24px;
}

.header-content {
  max-width: 900px;
  margin: 0 auto;
}

.title-text-group {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  line-height: 1.1;
}

.page-title {
  font-size: 3rem;
  font-weight: 500;
  margin-bottom: 0;
  color: #1d1d1f;
}

/* 填充满整个屏幕的主体收藏菜单 */
.favorites-full-menu {
  flex: 1 1 auto;
  width: 100%;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 20px 24px 28px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: visible;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* 选项卡 */
.fav-tabs-wrap {
  margin: 0 0 16px;
  overflow: hidden;
  border-bottom: 1px solid #f0f0f2;
  padding-bottom: 8px;
}

.fav-tabs {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 0 8px;
  scrollbar-width: none;
}

.fav-tabs::-webkit-scrollbar {
  display: none;
}

.fav-tabs.draggingTabs {
  touch-action: none;
  overflow-x: hidden;
}

.fav-tab {
  flex: 0 0 auto;
  font-weight: 400;
  font-size: 16px;
  color: #6e6e73;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 10px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.fav-tab:hover {
  color: #1d1d1f;
  background: rgba(0, 0, 0, 0.04);
}

.fav-tab.active {
  color: #007aff;
  font-weight: 700;
  background: rgba(0, 122, 255, 0.08);
}

.tab-editable {
  outline: none;
  border-bottom: 2px solid #007aff;
  padding: 0 2px;
  min-width: 30px;
  display: inline-block;
}

.tab-plus {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f2f2f7;
  color: #007aff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
}

.tab-plus:hover {
  background: #e5e5ea;
  transform: scale(1.06);
}

.tab-placeholder {
  display: inline-block;
  height: 1.4em;
  border: 2px dashed #ffb700;
  background: transparent;
  border-radius: 6px;
  flex: 0 0 auto;
}

.tab-ghost {
  pointer-events: none;
  color: #1d1d1f;
  font-weight: 700;
  z-index: 1001;
  background: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
}

/* 列表容器 */
.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

/* 收藏项 */
.favorites-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 60px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  user-select: none;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.15s ease;
  width: 100%;
  box-sizing: border-box;
}

.favorites-item:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
}

.favorites-item .fav-content {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  will-change: transform;
  transition: transform 0.15s ease;
  position: relative;
  z-index: 2;
  cursor: pointer;
}

.favorites-item .fav-index {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #f2f2f7;
  color: #1d1d1f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.fav-thumb-wrap {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  background: #f2f2f7;
}

.fav-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  background: #e5e5ea;
}

.fav-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.fav-name {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-meta {
  font-size: 12px;
  color: #8e8e93;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-right-meta {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.fav-rating {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 24px;
  padding: 0 6px;
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

/* 日期样式 */
.fav-date-trigger {
  border: none;
  background: transparent;
  padding: 4px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: background 0.15s ease;
}

.fav-date-trigger:hover {
  background: rgba(0, 0, 0, 0.04);
}

.fav-date-icon {
  width: 18px;
  height: 18px;
  fill: #8e8e93;
}

.fav-date-lines {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.05;
  gap: 1px;
}

.fav-date-year {
  font-size: 10px;
  font-weight: 600;
  color: #8e8e93;
}

.fav-date-md {
  font-size: 12px;
  font-weight: 700;
  color: #1d1d1f;
}

.fav-date-weekday {
  font-size: 10px;
  font-weight: 700;
  color: #dc2626;
}

.fav-date-native-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

/* 滑动操作按钮 */
.fav-left-actions {
  position: absolute;
  top: 50%;
  left: 10px;
  transform: translateY(-50%);
  z-index: 1;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.fav-left-actions.visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 0.18s ease;
}

.fav-delete {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 59, 48, 0.3);
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.fav-right-actions {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  z-index: 1;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.fav-right-actions.visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 0.18s ease;
}

.fav-pending {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(142, 142, 147, 0.3);
  background: rgba(142, 142, 147, 0.12);
  color: #3a3a3c;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.fav-pending.active {
  border-color: rgba(0, 122, 255, 0.35);
  background: rgba(0, 122, 255, 0.12);
  color: #007aff;
}

.favorites-item.pending .fav-content {
  filter: grayscale(100%);
  opacity: 0.6;
}

/* 占位符与拖拽效果 */
.favorites-placeholder {
  min-height: 60px;
  border: 2px dashed #ffd700;
  border-radius: 12px;
  width: 100%;
  box-sizing: border-box;
}

.favorites-item.dragging-shadow {
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
}

.favorites-item.just-inserted {
  animation: fav-drop-highlight 0.7s ease;
}

@keyframes fav-drop-highlight {
  0% {
    background: #fff8db;
    box-shadow: 0 4px 16px rgba(255, 215, 0, 0.3);
  }
  100% {
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  }
}

/* 自创景点 + 按钮 */
.favorites-add {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
}

.favorites-add .plus-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f2f2f7;
  color: #334155;
  font-size: 24px;
  font-weight: 700;
  line-height: 36px;
  text-align: center;
  transition: transform 0.15s ease, background 0.2s ease;
}

.favorites-add .plus-circle:hover {
  background: #e5e5ea;
  transform: scale(1.08);
}

/* 导入导出按钮行 */
.favorites-actions-row {
  display: flex;
  gap: 14px;
  margin-top: 12px;
}

.favorites-action-btn {
  flex: 1 1 0;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid #d2d2d7;
  background: #f8fafc;
  color: #1d1d1f;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.favorites-action-btn:hover {
  background: #f2f2f7;
}

.favorites-action-btn.primary {
  background: #007aff;
  color: #fff;
  border-color: #007aff;
}

.favorites-action-btn.primary:hover {
  background: #0056cc;
}

.hidden-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

/* 删除收藏操作 */
.favorites-clear {
  margin-top: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 59, 48, 0.2);
  border-radius: 12px;
  color: #ff3b30;
  text-align: center;
  font-weight: 700;
  font-size: 15px;
  background: rgba(255, 59, 48, 0.06);
  cursor: pointer;
  transition: background 0.2s ease;
}

.favorites-clear:hover {
  background: rgba(255, 59, 48, 0.12);
}

/* 左下角固定返回按钮 */
.bottom-left-back-btn {
  position: fixed;
  left: 24px;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  z-index: 1000;
}

/* 通用弹窗对话框样式 */
.confirm-backdrop {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1200;
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px;
  min-width: 280px;
  max-width: calc(100vw - 36px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.24);
  z-index: 1201;
}

.confirm-message {
  margin-bottom: 16px;
  font-size: 15px;
  color: #1d1d1f;
  line-height: 1.4;
}

.danger-word {
  color: #ff3b30;
  font-weight: 800;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  background: #34c759;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 700;
  cursor: pointer;
}

.btn-danger {
  background: #ff3b30;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary {
  background: #007aff;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 700;
  cursor: pointer;
}

.confirm-close {
  position: absolute;
  top: 8px;
  right: 12px;
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  color: #8e8e93;
}

.export-area-wrap {
  margin: 10px 0 14px;
}

.export-textarea {
  width: 100%;
  height: 180px;
  border: 1px solid #d2d2d7;
  border-radius: 10px;
  padding: 10px;
  box-sizing: border-box;
  font-family: monospace;
  font-size: 12px;
}

/* 导出进度条 */
.export-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.export-progress-count {
  font-weight: 700;
  color: #007aff;
}

.export-progress-bar {
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #e5e5ea;
  overflow: hidden;
}

.export-progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: #34c759;
  transition: width 0.2s ease-out;
}

/* 收藏日期弹窗 */
.favorite-date-dialog {
  width: min(340px, calc(100vw - 24px));
  padding: 20px;
}

.favorite-date-header {
  margin-bottom: 12px;
}

.favorite-date-title {
  font-size: 18px;
  font-weight: 800;
  color: #1d1d1f;
}

.favorite-date-toolbar {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.favorite-date-nav-btn {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d2d2d7;
  border-radius: 10px;
  background: #f8fafc;
  font-size: 22px;
  cursor: pointer;
}

.favorite-date-selects {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.favorite-date-select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d2d2d7;
  font-weight: 700;
}

.favorite-date-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
  text-align: center;
  font-size: 12px;
  color: #8e8e93;
  font-weight: 700;
}

.favorite-date-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.favorite-date-day {
  aspect-ratio: 1;
  border: 1px solid #e5e5ea;
  border-radius: 8px;
  background: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.favorite-date-day.muted {
  color: #c7c7cc;
  background: #f8fafc;
}

.favorite-date-day.today {
  color: #007aff;
  border-color: #007aff;
}

.favorite-date-day.selected {
  background: #007aff;
  color: #fff;
  border-color: #007aff;
}

.favorite-date-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
}

.favorite-date-action-link {
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.favorite-date-action-link.clear {
  color: #ff3b30;
}

.favorite-date-action-link.today {
  color: #007aff;
}

/* 收藏项右键菜单 */
.favorites-context-menu {
  position: fixed;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
  padding: 6px;
  z-index: 1300;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.context-menu-item {
  border: none;
  background: transparent;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.context-menu-item:hover {
  background: #f2f2f7;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .favorites-page-container {
    padding: 16px 14px 90px;
  }
  .page-title {
    font-size: 1.5rem;
  }
  .favorites-full-menu {
    border-radius: 14px;
    padding: 14px 14px 20px;
  }
  .bottom-left-back-btn {
    left: 18px;
    bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.35rem;
    line-height: 1.15;
  }
  .favorites-page-container {
    padding: 12px 10px 84px;
  }
  .favorites-full-menu {
    padding: 12px 10px 18px;
  }
}
</style>
