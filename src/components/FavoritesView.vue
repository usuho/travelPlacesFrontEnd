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
    <main class="favorites-full-menu card" ref="favoritesMenu">
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
import { withBackendApiKey } from '../utils/geoApi.js';
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
      tabLongPressThreshold: 300,
      tabPressTimer: null,
      tabDragging: false,
      tabDragIndex: null,
      tabDragItem: null,
      tabDragX: 0,
      tabDragY: 0,
      tabOffsetX: 0,
      tabPlaceholderIndex: null,
      tabPlaceholderWidth: 0,
      tabFixedWidths: [],
      tabMoveListener: null,
      tabUpListener: null,
      tabGhostTop: 0,
      tabGhostLeft: 0,
      tabGhostWidth: 0,
      tabGhostHeight: 0,
      tabAutoScrollFrame: null,
      tabAutoScrollVelocity: 0,
      tabAutoScrollMode: null,
      tabStartScrollLeft: 0,

      // 列表拖拽重排与跨选项卡
      longPressThreshold: 500,
      dragging: false,
      dragIndex: null,
      dragItem: null,
      dragY: 0,
      dragX: 0,
      dragOffsetY: 0,
      dragLeft: 20,
      dragWidth: 320,
      dragListRect: null,
      dragBoundaries: [],
      placeholderStyle: {},
      placeholderIndex: null,
      dragSourceTabId: null,
      dragHoverTabIndex: null,
      tabHoverTimer: null,
      tabHoverDelay: 500,
      moveListener: null,
      upListener: null,
      autoScrollFrame: null,
      autoScrollVelocity: 0,
      dragHysteresis: 6,
      dragTouchTolerance: 8,
      pageScrollLocked: false,
      bodyOverflowBackup: null,
      bodyTouchActionBackup: null,
      recentlyMovedId: null,
      recentlyMovedTimer: null,

      // 滑动操作（左滑待定，右滑移除/删除）
      favSwipeActive: false,
      favSwipeItemId: null,
      favSwipeStartX: 0,
      favSwipeStartY: 0,
      favSwipeOffsetX: 0,
      favSwipeThreshold: 24,
      favSwipeMaxReveal: 56,
      favActionId: null,
      favRightActionId: null,
      favRightSwipeItemId: null,
      favRightSwipeOffsetX: 0,
      favRightSwipeThreshold: 24,
      favRightSwipeMaxReveal: 56,

      // 收藏列表触摸滚动检测
      favListTouchStartX: 0,
      favListTouchStartY: 0,
      favListScrollStartTop: 0,
      favListTouchScrolling: false,
      favListTouchTolerance: 8,

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
      const nodes = [];
      const favs = this.sortedFavorites || [];
      let insertedPlaceholder = false;
      for (let i = 0; i < favs.length; i++) {
        if (!insertedPlaceholder && this.dragging && this.placeholderIndex === i && this.dragIndex !== i) {
          insertedPlaceholder = true;
          nodes.push({ type: 'placeholder', key: 'fav-ph' });
        }
        const f = favs[i];
        nodes.push({ type: 'item', key: `fav-item-${f.country}-${f.id}`, f, index: i });
      }
      if (!insertedPlaceholder && this.dragging && this.placeholderIndex === favs.length) {
        nodes.push({ type: 'placeholder', key: 'fav-ph' });
      }
      return nodes;
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
    },
    sortedFavorites: {
      handler(list) {
        if (Array.isArray(list)) {
          this.$nextTick(() => {
            try { list.forEach(f => this.ensureFavThumb(f)); } catch (e) {}
          });
        }
      },
      immediate: true
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
    if (this.tabPressTimer) clearTimeout(this.tabPressTimer);
    this.clearTabHoverTimer();
    this.stopAutoScroll();
    this.stopTabAutoScroll();
    this.detachDragListeners();
    this.detachTabDragListeners();
    this.unlockPageTouchScroll();
    if (this.favoritesContextMenuLockTimer) clearTimeout(this.favoritesContextMenuLockTimer);
    if (this._onHardwareBack) {
      try { window.removeEventListener('hardware-back', this._onHardwareBack); } catch (e) {}
    }
    try {
      Object.values(this.favThumbs || {}).forEach(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          try { URL.revokeObjectURL(url); } catch (e) {}
        }
      });
    } catch (e) {}
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
      if (!f) return '';
      const base = `${String(f.country || '')}-${String(f.id)}`;
      if (String(f.country) !== 'custom') return base;
      try {
        const a = findCustomAttractionById(f.id);
        const mainRef = a && a.images && a.images.main;
        return `${base}-${mainRef || 'none'}`;
      } catch (e) {
        return base;
      }
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
      try {
        if (String(f.country) === 'custom') {
          const a = findCustomAttractionById(f.id);
          let url = '';
          if (a && a.images && a.images.main) {
            const imageKey = a.images.main;
            url = await getCustomImageUrl(imageKey);
            if (!url) {
              try {
                if (!imageKey.includes('/')) {
                  if (a && a.hasImage1) {
                    url = await getCustomImageUrl(`${f.id}:main`);
                  }
                }
              } catch (e) {}
            }
          } else if (a && a.hasImage1) {
            url = await getCustomImageUrl(`${f.id}:main`);
          }
          if (url) {
            this.favThumbs = { ...this.favThumbs, [key]: url };
          }
          return;
        }
        // 非自创景点：从后端API获取图片（附带后端API鉴权Header）
        const imageUrl = `https://juseaxerf.com/api/attraction-image/${f.country}/${f.id}/1`;
        const res = await fetch(imageUrl, withBackendApiKey());
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        this.favThumbs = { ...this.favThumbs, [key]: url };
      } catch (e) {}
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

    // 页面与列表触摸滚动锁定/解锁
    lockPageTouchScroll() {
      if (this.pageScrollLocked) return;
      this.pageScrollLocked = true;
      try {
        const body = (typeof document !== 'undefined') ? document.body : null;
        if (!body) return;
        this.bodyOverflowBackup = body.style.overflow || '';
        this.bodyTouchActionBackup = body.style.touchAction || '';
        body.style.overflow = 'hidden';
        body.style.touchAction = 'none';
      } catch (e) {}
    },
    unlockPageTouchScroll() {
      if (!this.pageScrollLocked) return;
      this.pageScrollLocked = false;
      try {
        const body = (typeof document !== 'undefined') ? document.body : null;
        if (body) {
          body.style.overflow = this.bodyOverflowBackup != null ? this.bodyOverflowBackup : '';
          body.style.touchAction = this.bodyTouchActionBackup != null ? this.bodyTouchActionBackup : '';
        }
      } catch (e) {}
      this.bodyOverflowBackup = null;
      this.bodyTouchActionBackup = null;
    },

    // 获取收藏列表 DOM 元素
    favoritesListEl() {
      const ref = this.$refs.favoritesList;
      if (!ref) return null;
      return ref.$el ? ref.$el : ref;
    },

    // 选项卡长按拖拽
    onTabPressStart(index, evt) {
      if (this.editingTabId) return;
      const isTouch = !!(evt && evt.touches && evt.touches[0]);
      const tp = isTouch ? evt.touches[0] : evt;
      const startX = tp.clientX;
      const startY = tp.clientY;
      const cancel = () => {
        if (this.tabPressTimer) { clearTimeout(this.tabPressTimer); this.tabPressTimer = null; }
        window.removeEventListener('mouseup', cancel, true);
        window.removeEventListener('touchend', cancel, true);
        window.removeEventListener('touchmove', onMove, { passive: false });
      };
      const onMove = (e) => {
        const p = e.touches ? e.touches[0] : e;
        if (!p) return;
        const dx = Math.abs(p.clientX - startX);
        const dy = Math.abs(p.clientY - startY);
        if (dx > 6 || dy > 6) {
          cancel();
        }
      };
      this.tabPressTimer = setTimeout(() => {
        this.beginTabDrag(index, startX, startY);
        cancel();
      }, this.tabLongPressThreshold);
      window.addEventListener('mouseup', cancel, true);
      window.addEventListener('touchend', cancel, true);
      window.addEventListener('touchmove', onMove, { passive: false });
    },
    beginTabDrag(index, startX, startY) {
      this.tabDragging = true;
      this.tabDragIndex = index;
      const tabs = this.$refs.favTabs;
      const tabEls = tabs ? Array.from(tabs.querySelectorAll('.fav-tab')) : [];
      this.tabStartScrollLeft = tabs ? tabs.scrollLeft : 0;
      this.tabFixedWidths = tabEls.map(el => Math.max(10, Math.round(el.getBoundingClientRect().width)));
      const dragEl = tabEls[index];
      const rect = dragEl ? dragEl.getBoundingClientRect() : null;
      this.tabDragX = startX;
      this.tabDragY = startY;
      this.tabOffsetX = rect ? (startX - rect.left) : 0;
      this.tabDragItem = this.sortedTabs[index];
      this.tabPlaceholderIndex = index;
      this.tabPlaceholderWidth = rect ? rect.width : (this.tabFixedWidths[index] || 40);
      this.tabGhostTop = rect ? rect.top : 0;
      this.tabGhostLeft = rect ? rect.left : 0;
      this.tabGhostHeight = rect ? rect.height : 24;
      try {
        const measured = dragEl ? Math.ceil(dragEl.scrollWidth || rect.width || 0) : (rect ? rect.width : 0);
        const extra = 16;
        const max = Math.min(window.innerWidth || 600, 480);
        this.tabGhostWidth = Math.max(40, Math.min(measured + extra, max));
      } catch (e) {
        this.tabGhostWidth = rect ? rect.width : 80;
      }
      this.attachTabDragListeners();
      this.$nextTick(() => {
        try { if (this.$refs.favTabs) this.$refs.favTabs.scrollLeft = this.tabStartScrollLeft; } catch(e) {}
        this.maybeTabAutoScroll({ clientX: startX, clientY: startY });
      });
    },
    attachTabDragListeners() {
      this.tabMoveListener = (e) => this.onTabDragMove(e);
      this.tabUpListener = (e) => this.finishTabDrag(e);
      window.addEventListener('mousemove', this.tabMoveListener, true);
      window.addEventListener('mouseup', this.tabUpListener, true);
      window.addEventListener('touchmove', this.tabMoveListener, { passive: false, capture: true });
      window.addEventListener('touchend', this.tabUpListener, true);
    },
    detachTabDragListeners() {
      try {
        window.removeEventListener('mousemove', this.tabMoveListener, true);
        window.removeEventListener('mouseup', this.tabUpListener, true);
        window.removeEventListener('touchmove', this.tabMoveListener, { capture: true });
        window.removeEventListener('touchend', this.tabUpListener, true);
      } catch (e) {}
      this.tabMoveListener = null;
      this.tabUpListener = null;
    },
    onTabDragMove(evt) {
      if (!this.tabDragging) return;
      try {
        if (evt && typeof evt.preventDefault === 'function' && evt.cancelable) {
          evt.preventDefault();
        }
      } catch (e) {}
      const p = evt.touches ? evt.touches[0] : evt;
      if (!p) return;
      this.tabDragX = p.clientX;
      this.tabDragY = p.clientY;
      this.tabGhostLeft = p.clientX - this.tabOffsetX;
      const tabs = this.$refs.favTabs;
      const tabEls = tabs ? Array.from(tabs.querySelectorAll('.fav-tab')) : [];
      const rects = tabEls.map(el => el.getBoundingClientRect());
      const centers = rects.map(r => (r.left + r.right) / 2);
      let target = centers.length;
      for (let i = 0; i < centers.length; i++) {
        if (this.tabDragX < centers[i]) { target = i; break; }
      }
      this.tabPlaceholderIndex = Math.max(0, Math.min(target, this.sortedTabs.length));
      this.maybeTabAutoScroll(p);
    },
    finishTabDrag(evt) {
      const p = evt.changedTouches ? evt.changedTouches[0] : evt;
      const menu = this.$refs.favoritesMenu;
      const from = this.tabDragIndex;
      let deleteOutside = false;
      if (menu) {
        const r = menu.getBoundingClientRect();
        const gLeft = this.tabGhostLeft;
        const gTop = this.tabGhostTop;
        const gRight = gLeft + (this.tabGhostWidth || 40);
        const gBottom = gTop + (this.tabGhostHeight || 24);
        const noIntersect = (gRight < r.left) || (gLeft > r.right) || (gBottom < r.top) || (gTop > r.bottom);
        deleteOutside = noIntersect;
      }
      if (deleteOutside) {
        const del = this.sortedTabs[from];
        if (del) {
          const tab = this.favoriteTabs.find(t => t.id === del.id);
          const count = tab && Array.isArray(tab.items) ? tab.items.length : 0;
          if (count === 0) {
            this.tabDeleteTargetId = del.id;
            this.performDeleteTab();
          } else {
            this.confirmDeleteTab(del.id);
          }
        }
      } else {
        let to = this.tabPlaceholderIndex;
        if (to > this.sortedTabs.length - 1) to = this.sortedTabs.length - 1;
        if (from !== to && from >= 0 && to >= 0) {
          const ordered = [...this.sortedTabs];
          const [mvd] = ordered.splice(from, 1);
          ordered.splice(to, 0, mvd);
          ordered.forEach((t, i) => {
            const real = this.favoriteTabs.find(x => x.id === t.id);
            if (real) real.order = i + 1;
          });
          this.normalizeTabsOrder();
          this.saveFavorites();
        }
      }
      this.tabDragging = false;
      this.tabDragIndex = null;
      this.tabDragItem = null;
      this.tabPlaceholderIndex = null;
      this.tabPlaceholderWidth = 0;
      this.tabFixedWidths = [];
      this.tabGhostTop = 0;
      this.tabGhostLeft = 0;
      this.tabDragY = 0;
      this.stopTabAutoScroll();
      this.detachTabDragListeners();
    },
    maybeTabAutoScroll(point, mode = 'tab') {
      const tabs = this.$refs.favTabs;
      if (!tabs) { this.stopTabAutoScroll(); return; }

      const r = tabs.getBoundingClientRect();
      const x = point.clientX;
      const y = point.clientY;

      // 只在“靠近选项卡行”的纵向带状区域内才允许自动滚动
      if (mode === 'item') {
        const margin = 120;
        const bandTop = r.top;
        const bandBottom = r.bottom + margin;

        if (typeof y === 'number' && (y < bandTop || y > bandBottom)) {
          if (this.tabAutoScrollMode === mode) this.stopTabAutoScroll();
          return;
        }
      }

      const threshold = Math.min(80, r.width / 3);
      let velocity = 0;

      if (x < r.left + threshold) {
        const dist = x - (r.left + threshold);
        velocity = Math.max(-12, (dist / threshold) * 12);
      } else if (x > r.right - threshold) {
        const dist = x - (r.right - threshold);
        velocity = Math.min(12, (dist / threshold) * 12);
      }

      if (velocity !== 0) {
        this.tabAutoScrollMode = mode;
        this.tabAutoScrollVelocity = velocity;
        if (!this.tabAutoScrollFrame) this.runTabAutoScrollLoop();
      } else if (this.tabAutoScrollMode === mode) {
        this.stopTabAutoScroll();
      }
    },
    runTabAutoScrollLoop() {
      if (this.tabAutoScrollFrame) {
        window.cancelAnimationFrame(this.tabAutoScrollFrame);
      }
      const step = () => {
        const mode = this.tabAutoScrollMode;
        const usingTabDrag = mode === 'tab' && this.tabDragging;
        const usingItemDrag = mode === 'item' && this.dragging;

        if (!usingTabDrag && !usingItemDrag) { this.stopTabAutoScroll(); return; }

        const tabs = this.$refs.favTabs;
        if (!tabs) { this.stopTabAutoScroll(); return; }

        const r = tabs.getBoundingClientRect();
        const x = usingTabDrag ? this.tabDragX : this.dragX;
        const y = usingTabDrag ? this.tabDragY : this.dragY;

        if (usingItemDrag) {
          const margin = 120;
          const bandTop = r.top;
          const bandBottom = r.bottom + margin;
          if (typeof y === 'number' && (y < bandTop || y > bandBottom)) {
            this.stopTabAutoScroll();
            return;
          }
        }

        const threshold = Math.min(100, r.width / 3);
        let v = 0;
        if (x < r.left + threshold) {
          const dist = x - (r.left + threshold);
          v = Math.max(-14, (dist / threshold) * 14);
        } else if (x > r.right - threshold) {
          const dist = x - (r.right - threshold);
          v = Math.min(14, (dist / threshold) * 14);
        }
        this.tabAutoScrollVelocity = v;

        if (Math.abs(this.tabAutoScrollVelocity) < 0.5) {
          this.stopTabAutoScroll();
          return;
        }

        const maxScroll = tabs.scrollWidth - tabs.clientWidth;
        let next = tabs.scrollLeft + this.tabAutoScrollVelocity;
        if (next < 0) next = 0;
        if (next > maxScroll) next = maxScroll;

        if (next !== tabs.scrollLeft) {
          tabs.scrollLeft = next;

          if (usingTabDrag) {
            const tabEls = Array.from(tabs.querySelectorAll('.fav-tab'));
            const rects = tabEls.map(el => el.getBoundingClientRect());
            const centers = rects.map(r => (r.left + r.right) / 2);
            let target = centers.length;
            for (let i = 0; i < centers.length; i++) {
              if (this.tabDragX < centers[i]) { target = i; break; }
            }
            this.tabPlaceholderIndex = Math.max(0, Math.min(target, this.sortedTabs.length));
          } else if (usingItemDrag) {
            this.handleTabHoverDuringItemDrag({ clientX: x, clientY: this.dragY });
          }
        } else {
          this.stopTabAutoScroll();
          return;
        }

        this.tabAutoScrollFrame = window.requestAnimationFrame(step);
      };
      this.tabAutoScrollFrame = window.requestAnimationFrame(step);
    },
    stopTabAutoScroll() {
      if (this.tabAutoScrollFrame) {
        window.cancelAnimationFrame(this.tabAutoScrollFrame);
        this.tabAutoScrollFrame = null;
      }
      this.tabAutoScrollVelocity = 0;
      this.tabAutoScrollMode = null;
    },
    onTabsWheel(evt) {
      try {
        const tabs = this.$refs.favTabs;
        if (!tabs) return;
        const dx = Math.abs(evt.deltaY) > Math.abs(evt.deltaX) ? evt.deltaY : evt.deltaX;
        if (!dx) return;
        const max = tabs.scrollWidth - tabs.clientWidth;
        let next = tabs.scrollLeft + dx;
        if (next < 0) next = 0;
        if (next > max) next = max;
        if (next !== tabs.scrollLeft) {
          tabs.scrollLeft = next;
          if (this.tabDragging) {
            const tabEls = Array.from(tabs.querySelectorAll('.fav-tab'));
            const rects = tabEls.map(el => el.getBoundingClientRect());
            const centers = rects.map(r => (r.left + r.right) / 2);
            let target = centers.length;
            for (let i = 0; i < centers.length; i++) {
              if (this.tabDragX < centers[i]) { target = i; break; }
            }
            this.tabPlaceholderIndex = Math.max(0, Math.min(target, this.sortedTabs.length));
          }
        }
      } catch (e) {}
    },
    onTabsTouchMove(evt) {
      if (this.tabDragging) {
        try {
          if (evt && typeof evt.preventDefault === 'function' && evt.cancelable) {
            evt.preventDefault();
          }
        } catch (e) {}
      }
    },
    getDraggedTabWidth() {
      try {
        const tabs = this.$refs.favTabs;
        const els = tabs ? Array.from(tabs.querySelectorAll('.fav-tab')) : [];
        const el = (typeof this.tabDragIndex === 'number' && els[this.tabDragIndex]) ? els[this.tabDragIndex] : null;
        if (el) return Math.max(28, Math.round(el.getBoundingClientRect().width));
      } catch (e) {}
      return (this.tabFixedWidths && this.tabFixedWidths[this.tabDragIndex]) || 60;
    },

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

    // 收藏列表触摸滚动检测（用于禁止右滑删除）
    onFavoritesListTouchStart(evt) {
      const list = this.favoritesListEl();
      const t = evt && evt.touches && evt.touches[0];
      this.favListTouchStartX = t ? t.clientX : 0;
      this.favListTouchStartY = t ? t.clientY : 0;
      this.favListScrollStartTop = list ? list.scrollTop : 0;
      this.favListTouchScrolling = false;
    },
    onFavoritesListTouchMove(evt) {
      const list = this.favoritesListEl();
      const t = evt && evt.touches && evt.touches[0];
      if (!t) return;
      const dx = t.clientX - this.favListTouchStartX;
      const dy = t.clientY - this.favListTouchStartY;
      const movedY = Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > this.favListTouchTolerance;
      const scrolled = list && Math.abs((list.scrollTop || 0) - (this.favListScrollStartTop || 0)) > 0;
      if (movedY || scrolled) {
        this.favListTouchScrolling = true;
        if (this.favActionId || this.favSwipeOffsetX || this.favRightActionId || this.favRightSwipeOffsetX) {
          this.favActionId = null;
          this.favSwipeOffsetX = 0;
          this.favRightActionId = null;
          this.favRightSwipeOffsetX = 0;
        }
        this.favSwipeActive = false;
        this.favSwipeItemId = null;
        this.favRightSwipeItemId = null;
      }
    },
    onFavoritesListTouchEnd() {
      setTimeout(() => { this.favListTouchScrolling = false; }, 50);
    },

    // 收藏项触摸与滑动操作
    onFavTouchStart(f, idx, evt) {
      if (this.dragging || this.favListTouchScrolling) return;
      if (evt && evt.touches && evt.touches[0]) {
        const t = evt.touches[0];
        this.favSwipeStartX = t.clientX;
        this.favSwipeStartY = t.clientY;
        this.favSwipeActive = true;
        this.favSwipeItemId = f.id;
        this.favRightSwipeItemId = f.id;
      }
    },
    onFavTouchMove(evt) {
      if (this.dragging || this.favListTouchScrolling) return;
      if (!this.favSwipeActive || !evt || !evt.touches || !evt.touches[0]) return;
      const t = evt.touches[0];
      const dx = t.clientX - this.favSwipeStartX;
      const dy = t.clientY - this.favSwipeStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          if (this.favRightActionId && this.favRightActionId === this.favRightSwipeItemId) {
            const base = -this.favRightSwipeMaxReveal;
            const offset = Math.min(0, base + dx);
            this.favRightSwipeOffsetX = offset;
            this.favActionId = null;
            this.favSwipeOffsetX = 0;
            if (evt.cancelable) evt.preventDefault();
          } else {
            this.favRightActionId = null;
            this.favRightSwipeOffsetX = 0;
            const offset = Math.max(0, Math.min(this.favSwipeMaxReveal, dx));
            this.favSwipeOffsetX = offset;
            if (evt.cancelable) evt.preventDefault();
          }
        } else if (dx < 0) {
          if (this.favActionId && this.favActionId === this.favSwipeItemId) {
            const base = this.favSwipeMaxReveal;
            const offset = Math.max(0, base + dx);
            this.favSwipeOffsetX = offset;
            this.favRightActionId = null;
            this.favRightSwipeOffsetX = 0;
            if (evt.cancelable) evt.preventDefault();
          } else {
            this.favActionId = null;
            this.favSwipeOffsetX = 0;
            const offset = Math.min(0, Math.max(-this.favRightSwipeMaxReveal, dx));
            this.favRightSwipeOffsetX = offset;
            if (evt.cancelable) evt.preventDefault();
          }
        }
      }
    },
    onFavTouchEnd(f, idx, evt) {
      if (this.dragging || this.favListTouchScrolling) { this.favSwipeActive = false; return; }
      const keepRight = Math.abs(this.favRightSwipeOffsetX || 0) >= this.favRightSwipeThreshold;
      const keepLeft = (this.favSwipeOffsetX || 0) >= this.favSwipeThreshold;
      if (keepLeft) {
        this.favActionId = this.favSwipeItemId;
        this.favSwipeOffsetX = this.favSwipeMaxReveal;
        this.favRightActionId = null;
        this.favRightSwipeOffsetX = 0;
      } else {
        this.favActionId = null;
        this.favSwipeOffsetX = 0;
      }
      if (keepRight) {
        this.favRightActionId = this.favRightSwipeItemId;
        this.favRightSwipeOffsetX = -this.favRightSwipeMaxReveal;
        this.favActionId = null;
        this.favSwipeOffsetX = 0;
      } else if (!keepLeft) {
        this.favRightActionId = null;
        this.favRightSwipeOffsetX = 0;
      }
      this.favSwipeActive = false;
      this.favSwipeItemId = null;
      this.favRightSwipeItemId = null;
    },
    isFavActionsVisible(f) {
      if (!f) return false;
      if (this.favActionId === f.id) return true;
      if (this.favSwipeItemId === f.id && (this.favSwipeOffsetX || 0) > 0) return true;
      return false;
    },
    isFavRightActionsVisible(f) {
      if (!f) return false;
      if (this.favRightActionId === f.id) return true;
      if (this.favRightSwipeItemId === f.id && (this.favRightSwipeOffsetX || 0) < 0) return true;
      return false;
    },
    getFavSwipeOffset(f) {
      if (this.favSwipeItemId === f.id && (this.favSwipeOffsetX || 0) !== 0) return this.favSwipeOffsetX || 0;
      if (this.favActionId === f.id) return this.favSwipeMaxReveal;
      if (this.favRightSwipeItemId === f.id && (this.favRightSwipeOffsetX || 0) !== 0) return this.favRightSwipeOffsetX || 0;
      if (this.favRightActionId === f.id) return -this.favRightSwipeMaxReveal;
      return 0;
    },
    togglePending(f) {
      if (!f) return;
      this.closeFavoritesContextMenu();
      f.pending = !f.pending;
      this.favActionId = null;
      this.favSwipeOffsetX = 0;
      this.favRightActionId = null;
      this.favRightSwipeOffsetX = 0;
      this.normalizeFavoritesOrder();
      this.saveFavorites();
    },
    removeFavorite(f) {
      if (!f) return;
      this.closeFavoritesContextMenu();
      this.itemDeleteTarget = { ...f };
      this.itemDeleteConfirmVisible = true;
    },
    cancelDeleteItem() {
      this.itemDeleteConfirmVisible = false;
      this.itemDeleteTarget = null;
      if (this.favActionId) this.favActionId = null;
      this.favSwipeOffsetX = 0;
      if (this.favRightActionId) this.favRightActionId = null;
      this.favRightSwipeOffsetX = 0;
    },
    performDeleteItem() {
      const t = this.itemDeleteTarget;
      if (!t) return;
      try {
        const activeTab = this.favoriteTabs.find(tab => tab.id === this.activeTabId);
        if (activeTab && Array.isArray(activeTab.items)) {
          const idx = activeTab.items.findIndex(x => String(x.id) === String(t.id) && String(x.country || '') === String(t.country || ''));
          if (idx >= 0) {
            activeTab.items.splice(idx, 1);
            this.favorites = activeTab.items;
            this.normalizeFavoritesOrder();
            this.saveFavorites();
          }
        }
      } catch (e) {}
      if (String(t.country) === 'custom') {
        let keysToDelete = [];
        try {
          const custom = findCustomAttractionById(t.id);
          const isImported = custom && custom.isImported === true;
          if (!isImported) {
            const imgs = custom && custom.images ? custom.images : {};
            const sec = Array.isArray(imgs.secondary) ? imgs.secondary : [];
            if (imgs.main) keysToDelete.push(imgs.main);
            if (sec[0]) keysToDelete.push(sec[0]);
            if (sec[1]) keysToDelete.push(sec[1]);
          }
        } catch (e) {}
        try { deleteCustomAttraction(t.id); } catch (e) {}
        try { deleteCustomImagesForId(t.id); } catch (e) {}
        try { if (keysToDelete.length) deleteCustomImages(keysToDelete); } catch (e) {}
      }
      const key = this.thumbKey(t);
      if (this.favThumbs[key]) {
        try { URL.revokeObjectURL(this.favThumbs[key]); } catch(e) {}
        const nextThumbs = { ...this.favThumbs };
        delete nextThumbs[key];
        this.favThumbs = nextThumbs;
      }
      this.itemDeleteConfirmVisible = false;
      this.itemDeleteTarget = null;
      this.favActionId = null;
      this.favSwipeOffsetX = 0;
      this.favRightActionId = null;
      this.favRightSwipeOffsetX = 0;
    },

    // 收藏项拖拽重排与跨选项卡
    onFavoritesNodeMouseDown(node, evt) {
      if (!node || node.type !== 'item') return;
      if (evt && typeof evt.button === 'number' && evt.button !== 0) return;
      if (evt && evt.preventDefault) evt.preventDefault();
      this.startMenuItemPress(node.index, evt);
    },
    onFavoritesNodeTouchStart(node, evt) {
      if (!node || node.type !== 'item') return;
      if (this.isFavoriteDateEvent(evt)) return;
      this.startMenuItemPress(node.index, evt);
      this.onFavTouchStart(node.f, node.index, evt);
    },
    onFavoritesNodeTouchMove(node, evt) {
      if (!node || node.type !== 'item') return;
      if (this.isFavoriteDateEvent(evt)) return;
      this.onFavTouchMove(evt);
    },
    onFavoritesNodeTouchEnd(node, evt) {
      if (!node || node.type !== 'item') return;
      if (this.isFavoriteDateEvent(evt)) return;
      this.onFavTouchEnd(node.f, node.index, evt);
    },
    onFavoritesNodeClick(node, evt) {
      if (!node || node.type !== 'item') return;
      if (this.isFavoriteDateEvent(evt)) return;
      if (Date.now() < Number(this.favoriteDateClickLockUntil || 0)) return;
      if (evt && evt.stopPropagation) evt.stopPropagation();
      this.handleMenuItemClick(node.f, node.index, evt);
    },
    onFavoritesNodeContextMenu(node, evt) {
      if (!node || node.type !== 'item') return;
      if (evt && evt.preventDefault) evt.preventDefault();
      if (evt && evt.stopPropagation) evt.stopPropagation();
      this.onFavoriteContextMenu(node.f, node.index, evt);
    },
    startMenuItemPress(index, evt) {
      if (evt && typeof evt.button === 'number' && evt.button !== 0) return;
      this.closeFavoritesContextMenu();
      const e = evt.touches ? evt.touches[0] : evt;
      const startX = e.clientX;
      const startY = e.clientY;
      const touchId = evt.touches ? evt.touches[0].identifier : null;
      const originEl = (evt.currentTarget && evt.currentTarget.closest)
        ? evt.currentTarget.closest('.favorites-item')
        : null;
      const originRect = originEl ? originEl.getBoundingClientRect() : null;
      let triggered = false;
      const timer = setTimeout(() => {
        triggered = true;
        this.beginDrag(index, startX, startY, originRect);
      }, this.longPressThreshold);
      const cancel = () => {
        clearTimeout(timer);
        window.removeEventListener('mouseup', cancel, true);
        window.removeEventListener('touchend', cancel, true);
        window.removeEventListener('touchmove', preventScroll, { passive: false });
      };
      const preventScroll = (ev) => {
        const point = ev.touches
          ? Array.from(ev.touches).find(t => touchId === null || t.identifier === touchId)
          : ev;
        if (!point) return;
        const dx = point.clientX - startX;
        const dy = point.clientY - startY;
        const distance = Math.hypot(dx, dy);
        if (triggered) {
          if (ev.cancelable) ev.preventDefault();
          return;
        }
        if (distance > this.dragTouchTolerance) {
          cancel();
          return;
        }
        if (ev.cancelable) ev.preventDefault();
      };
      window.addEventListener('mouseup', cancel, true);
      window.addEventListener('touchend', cancel, true);
      window.addEventListener('touchmove', preventScroll, { passive: false });
    },
    beginDrag(index, startClientX, startClientY, originRect) {
      this.dragging = true;
      this.dragIndex = index;
      this.lockPageTouchScroll();
      this.dragItem = { ...this.sortedFavorites[index] };
      this.dragSourceTabId = this.activeTabId;
      this.dragHoverTabIndex = null;
      this.clearTabHoverTimer();
      this.dragX = startClientX;
      const list = this.favoritesListEl();
      if (!list) return;
      this.dragListRect = list.getBoundingClientRect();
      const itemEls = Array.from(list.querySelectorAll('.favorites-item'));
      const elRect = (itemEls[index] && itemEls[index].getBoundingClientRect) ? itemEls[index].getBoundingClientRect() : null;
      const baseRect = elRect || originRect || this.dragListRect;
      this.dragOffsetY = startClientY - baseRect.top;
      this.dragY = startClientY;
      this.dragLeft = baseRect ? baseRect.left : this.dragListRect.left;
      this.dragWidth = baseRect ? baseRect.width : this.dragListRect.width;
      this.placeholderIndex = index;
      try {
        let ph = 0;
        if (elRect && elRect.height) ph = elRect.height;
        else if (itemEls[0]) ph = itemEls[0].getBoundingClientRect().height || 0;
        if (ph) this.placeholderStyle = { height: ph + 'px' };
      } catch (e) { this.placeholderStyle = {}; }

      this.favActionId = null;
      this.favSwipeActive = false;
      this.favSwipeItemId = null;
      this.favSwipeOffsetX = 0;
      this.favRightActionId = null;
      this.favRightSwipeItemId = null;
      this.favRightSwipeOffsetX = 0;
      this.favListTouchScrolling = false;
      this.captureDragMetrics(itemEls, list);
      this.stopAutoScroll();
      this.attachDragListeners();
    },
    attachDragListeners() {
      this.moveListener = (evt) => {
        const e = evt.touches ? evt.touches[0] : evt;
        if (evt.cancelable) evt.preventDefault();
        this.dragY = e.clientY;
        this.dragX = e.clientX;
        this.updatePlaceholderIndex();
        this.maybeAutoScroll();
        this.handleTabHoverDuringItemDrag(e);
        this.maybeTabAutoScroll(e, 'item');
      };
      this.upListener = (evt) => {
        this.finishDrag(evt);
      };
      window.addEventListener('mousemove', this.moveListener, true);
      window.addEventListener('touchmove', this.moveListener, { passive: false, capture: true });
      window.addEventListener('mouseup', this.upListener, true);
      window.addEventListener('touchend', this.upListener, true);
    },
    detachDragListeners() {
      if (this.moveListener) {
        window.removeEventListener('mousemove', this.moveListener, true);
        window.removeEventListener('touchmove', this.moveListener, { capture: true });
        this.moveListener = null;
      }
      if (this.upListener) {
        window.removeEventListener('mouseup', this.upListener, true);
        window.removeEventListener('touchend', this.upListener, true);
        this.upListener = null;
      }
      this.stopAutoScroll();
      this.stopTabAutoScroll();
      this.clearTabHoverTimer();
      this.dragHoverTabIndex = null;
      this.dragBoundaries = [];
    },
    captureDragMetrics(itemEls, list) {
      const targetList = list || this.favoritesListEl();
      if (!targetList) {
        this.dragBoundaries = [];
        return;
      }
      const elements = (itemEls && itemEls.length)
        ? itemEls
        : Array.from(targetList.querySelectorAll('.favorites-item'));
      if (!elements.length) {
        this.dragBoundaries = [];
        return;
      }
      const listRect = this.dragListRect || targetList.getBoundingClientRect();
      const baseTop = listRect.top;
      const scrollTop = targetList.scrollTop;
      this.dragBoundaries = elements.map(el => {
        const rect = el.getBoundingClientRect();
        const start = rect.top - baseTop + scrollTop;
        const end = rect.bottom - baseTop + scrollTop;
        return {
          start,
          end,
          mid: (start + end) / 2,
        };
      });
    },
    clearTabHoverTimer() {
      if (this.tabHoverTimer) {
        clearTimeout(this.tabHoverTimer);
        this.tabHoverTimer = null;
      }
    },
    handleTabHoverDuringItemDrag(point) {
      if (!this.dragging || !point) return;
      const tabs = this.$refs.favTabs;
      if (!tabs) {
        this.clearTabHoverTimer();
        this.dragHoverTabIndex = null;
        return;
      }
      const rect = tabs.getBoundingClientRect();
      const x = point.clientX;
      const y = point.clientY;
      const withinVertical = y >= rect.top && y <= rect.bottom;
      if (!withinVertical) {
        if (this.dragHoverTabIndex !== null) {
          this.dragHoverTabIndex = null;
        }
        this.clearTabHoverTimer();
        return;
      }
      const tabEls = Array.from(tabs.querySelectorAll('.fav-tab'));
      let hoveredIndex = -1;
      for (let i = 0; i < tabEls.length; i++) {
        const el = tabEls[i];
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          hoveredIndex = i;
          break;
        }
      }
      if (hoveredIndex < 0) {
        if (this.dragHoverTabIndex !== null) {
          this.dragHoverTabIndex = null;
        }
        this.clearTabHoverTimer();
        return;
      }
      const hoveredTab = this.sortedTabs[hoveredIndex];
      if (!hoveredTab || hoveredTab.id === this.activeTabId) {
        if (this.dragHoverTabIndex !== null) {
          this.dragHoverTabIndex = null;
        }
        this.clearTabHoverTimer();
        return;
      }
      if (this.dragHoverTabIndex !== hoveredIndex) {
        this.clearTabHoverTimer();
        this.dragHoverTabIndex = hoveredIndex;
        this.tabHoverTimer = setTimeout(() => {
          this.activateTabForDrag(hoveredTab.id);
        }, this.tabHoverDelay);
      }
    },
    activateTabForDrag(tabId) {
      this.clearTabHoverTimer();
      if (!this.dragging) return;
      const targetTab = this.favoriteTabs.find(t => t.id === tabId);
      if (!targetTab || tabId === this.activeTabId) return;
      this.setActiveTab(tabId);
      this.dragHoverTabIndex = null;
      this.$nextTick(() => {
        const list = this.favoritesListEl();
        if (list) {
          this.dragListRect = list.getBoundingClientRect();
          const itemEls = Array.from(list.querySelectorAll('.favorites-item'));
          this.captureDragMetrics(itemEls, list);
        }
        if (tabId === this.dragSourceTabId) {
          const idx = this.sortedFavorites.findIndex(item => item.id === (this.dragItem && this.dragItem.id));
          this.dragIndex = idx >= 0 ? idx : null;
        } else {
          this.dragIndex = null;
        }
        this.placeholderIndex = this.sortedFavorites.length;
        this.updatePlaceholderIndex();
      });
    },
    updatePlaceholderIndex() {
      if (!this.dragListRect) return;
      const list = this.favoritesListEl();
      if (!list) return;
      const listRect = this.dragListRect || list.getBoundingClientRect();
      const scrollTop = list.scrollTop;
      const relativeY = this.dragY - listRect.top + scrollTop;
      const children = Array.from(list.children || [])
        .filter(el => el.classList && (el.classList.contains('favorites-item') || el.classList.contains('favorites-placeholder')));
      if (!children.length) return;
      let target = this.sortedFavorites.length;
      let passedItems = 0;
      const localBoundaries = [];
      for (let i = 0; i < children.length; i++) {
        const el = children[i];
        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        if (!rect) continue;
        const start = rect.top - listRect.top + scrollTop;
        const end = rect.bottom - listRect.top + scrollTop;
        const mid = (start + end) / 2;
        const isItem = el.classList.contains('favorites-item');
        if (isItem) {
          localBoundaries.push({ start, end, mid });
        }
        if (relativeY < mid) {
          target = passedItems;
          break;
        }
        if (isItem) passedItems += 1;
      }
      const lastChild = children[children.length - 1];
      const lastRect = lastChild && lastChild.getBoundingClientRect ? lastChild.getBoundingClientRect() : null;
      if (lastRect) {
        const lastEnd = lastRect.bottom - listRect.top + scrollTop;
        if (relativeY >= lastEnd) {
          target = passedItems;
        }
      }
      const current = this.placeholderIndex != null ? this.placeholderIndex : this.dragIndex;
      const bounds = this.dragBoundaries && this.dragBoundaries.length ? this.dragBoundaries : localBoundaries;
      if (current != null && target !== current) {
        const refBoundary = bounds[Math.min(current, bounds.length - 1)];
        if (target < current && refBoundary && relativeY > (refBoundary.start + this.dragHysteresis)) {
          target = current;
        } else if (target > current && refBoundary && relativeY < (refBoundary.end - this.dragHysteresis)) {
          target = current;
        }
      }
      this.placeholderIndex = Math.max(0, Math.min(target, this.sortedFavorites.length));
    },
    computeDomPlaceholderIndex() {
      const list = this.favoritesListEl();
      if (!list) return this.placeholderIndex;
      const placeholder = list.querySelector('[data-fav-placeholder="active"]');
      if (!placeholder || !placeholder.parentNode) return this.placeholderIndex;
      let placeholderMid = null;
      try {
        const r = placeholder.getBoundingClientRect();
        placeholderMid = (r.top + r.bottom) / 2;
      } catch (e) {}

      const isLeavingAbsolute = (el) => {
        if (!el) return false;
        try {
          const s = window.getComputedStyle(el);
          return s && s.position === 'absolute';
        } catch (e) {
          return false;
        }
      };

      if (typeof placeholderMid === 'number') {
        const itemEls = Array.from(list.querySelectorAll('.favorites-item')).filter(el => !isLeavingAbsolute(el));
        let count = 0;
        for (const el of itemEls) {
          try {
            const rr = el.getBoundingClientRect();
            const mid = (rr.top + rr.bottom) / 2;
            if (mid < placeholderMid) count += 1;
          } catch (e) {}
        }
        return count;
      }

      const siblings = Array.from(placeholder.parentNode.children || []);
      let count = 0;
      for (const el of siblings) {
        if (el === placeholder) break;
        if (el.classList && el.classList.contains('favorites-item') && !isLeavingAbsolute(el)) {
          count += 1;
        }
      }
      return count;
    },
    getPlaceholderContentTop(indexOverride) {
      const list = this.favoritesListEl();
      if (!list) return null;
      const placeholderEl = list.querySelector('[data-fav-placeholder="active"]');
      if (placeholderEl && placeholderEl.getBoundingClientRect) {
        try {
          const listRect = list.getBoundingClientRect();
          const rect = placeholderEl.getBoundingClientRect();
          return (rect.top - listRect.top) + list.scrollTop;
        } catch (e) {}
      }
      const bounds = this.dragBoundaries;
      const idx = typeof indexOverride === 'number' ? indexOverride : this.placeholderIndex;
      if (!bounds || !bounds.length || idx == null) return null;
      if (idx <= 0) return bounds[0].start || 0;
      if (idx >= bounds.length) {
        return bounds[bounds.length - 1].end || 0;
      }
      return bounds[idx].start;
    },
    maybeAutoScroll() {
      if (!this.dragging) return;
      const list = this.favoritesListEl();
      if (!list) return;
      if (list.scrollHeight <= list.clientHeight + 1) {
        this.stopAutoScroll();
        return;
      }
      const rect = list.getBoundingClientRect();
      const threshold = Math.min(80, rect.height / 2);
      let velocity = 0;
      if (this.dragY < rect.top + threshold) {
        const distance = this.dragY - (rect.top + threshold);
        velocity = Math.max(-12, (distance / threshold) * 12);
      } else if (this.dragY > rect.bottom - threshold) {
        const distance = this.dragY - (rect.bottom - threshold);
        velocity = Math.min(12, (distance / threshold) * 12);
      }
      if (velocity !== 0) {
        this.autoScrollVelocity = velocity;
        if (!this.autoScrollFrame) {
          this.runAutoScrollLoop();
        }
      } else {
        this.stopAutoScroll();
      }
    },
    runAutoScrollLoop() {
      if (this.autoScrollFrame) {
        window.cancelAnimationFrame(this.autoScrollFrame);
      }
      const step = () => {
        if (!this.dragging) {
          this.stopAutoScroll();
          return;
        }
        const list = this.favoritesListEl();
        if (!list) {
          this.stopAutoScroll();
          return;
        }
        if (Math.abs(this.autoScrollVelocity) < 0.5) {
          this.stopAutoScroll();
          return;
        }
        const maxScroll = list.scrollHeight - list.clientHeight;
        let nextScroll = list.scrollTop + this.autoScrollVelocity;
        if (nextScroll < 0) nextScroll = 0;
        if (nextScroll > maxScroll) nextScroll = maxScroll;
        if (nextScroll !== list.scrollTop) {
          list.scrollTop = nextScroll;
          const itemEls = Array.from(list.querySelectorAll('.favorites-item'));
          this.captureDragMetrics(itemEls, list);
          this.updatePlaceholderIndex();
          this.maybeAutoScroll();
          if (Math.abs(this.autoScrollVelocity) < 0.5) {
            this.stopAutoScroll();
            return;
          }
        } else {
          this.stopAutoScroll();
          return;
        }
        this.autoScrollFrame = window.requestAnimationFrame(step);
      };
      this.autoScrollFrame = window.requestAnimationFrame(step);
    },
    stopAutoScroll() {
      if (this.autoScrollFrame) {
        window.cancelAnimationFrame(this.autoScrollFrame);
        this.autoScrollFrame = null;
      }
      this.autoScrollVelocity = 0;
    },
    finishDrag(evt) {
      const e = evt.changedTouches ? evt.changedTouches[0] : evt;
      const dropX = e.clientX;
      const dropY = e.clientY;
      const menu = this.$refs.favoritesMenu;
      const inside = menu && (() => {
        const r = menu.getBoundingClientRect();
        return dropX >= r.left && dropX <= r.right && dropY >= r.top && dropY <= r.bottom;
      })();
      const domIndex = this.computeDomPlaceholderIndex();
      const finalIndex = (typeof domIndex === 'number' && domIndex >= 0)
        ? domIndex
        : (this.placeholderIndex != null ? this.placeholderIndex : null);
      const list = this.favoritesListEl();
      const listRect = list && list.getBoundingClientRect ? list.getBoundingClientRect() : null;
      const pointerOffset = listRect ? Math.max(0, Math.min(listRect.height, dropY - listRect.top)) : 0;
      const placeholderTop = this.getPlaceholderContentTop(finalIndex);
      const fallbackScrollTop = list ? list.scrollTop : 0;
      const scrollTarget = (list && placeholderTop != null)
        ? Math.min(Math.max(placeholderTop - pointerOffset, 0), Math.max(0, (list.scrollHeight || 0) - (list.clientHeight || 0)))
        : fallbackScrollTop;
      const draggedId = this.dragItem && this.dragItem.id;
      const sourceTab = this.favoriteTabs.find(t => t.id === this.dragSourceTabId);
      let movedId = null;
      if (!inside) {
        const sourceItems = sourceTab && Array.isArray(sourceTab.items) ? sourceTab.items : this.favorites;
        const fi = draggedId ? sourceItems.find(f => f.id === draggedId) : null;
        if (fi) {
          this.itemDeleteTarget = { ...fi };
          this.itemDeleteConfirmVisible = true;
        }
      } else if (draggedId && sourceTab) {
        const targetTab = this.favoriteTabs.find(t => t.id === this.activeTabId);
        if (targetTab) {
          if (sourceTab.id === targetTab.id) {
            const ordered = [...this.sortedFavorites];
            let from = ordered.findIndex(item => item.id === draggedId);
            if (
              this.dragIndex != null &&
              this.dragIndex >= 0 &&
              this.dragIndex < ordered.length &&
              ordered[this.dragIndex] &&
              ordered[this.dragIndex].id === draggedId
            ) {
              from = this.dragIndex;
            }
            let to = finalIndex != null ? finalIndex : from;
            if (to < 0) to = 0;
            if (to > ordered.length) to = ordered.length;
            if (from >= 0 && to > from) {
              to -= 1;
            }
            if (from >= 0 && from < ordered.length && from !== to) {
              const [moved] = ordered.splice(from, 1);
              const insertIndex = Math.max(0, Math.min(to, ordered.length));
              ordered.splice(insertIndex, 0, moved);
              ordered.forEach((item, i) => { item.order = i + 1; });
              movedId = moved && moved.id ? moved.id : draggedId;
              this.normalizeTabItemsOrder(targetTab);
              if (this.activeTabId === targetTab.id) {
                this.favorites = targetTab.items;
                this.normalizeFavoritesOrder();
              }
              this.saveFavorites();
            }
          } else {
            const sourceItems = Array.isArray(sourceTab.items) ? sourceTab.items : [];
            const targetItems = Array.isArray(targetTab.items) ? targetTab.items : [];
            const sourceIdx = sourceItems.findIndex(item => item.id === draggedId);
            let moved = null;
            if (sourceIdx >= 0) {
              const removed = sourceItems.splice(sourceIdx, 1);
              moved = removed && removed[0] ? removed[0] : null;
              this.normalizeTabItemsOrder(sourceTab);
            }
            if (!moved) {
              moved = { ...this.dragItem };
            }
            const orderedTarget = [...this.sortedFavorites];
            let insertIndex = finalIndex != null ? finalIndex : orderedTarget.length;
            if (insertIndex < 0) insertIndex = 0;
            if (insertIndex > orderedTarget.length) insertIndex = orderedTarget.length;
            orderedTarget.splice(insertIndex, 0, moved);
            orderedTarget.forEach((item, i) => { item.order = i + 1; });
            targetItems.splice(0, targetItems.length, ...orderedTarget);
            movedId = moved && moved.id ? moved.id : draggedId;
            this.normalizeTabItemsOrder(targetTab);
            if (this.activeTabId === targetTab.id) {
              this.favorites = targetItems;
              this.normalizeFavoritesOrder();
            }
            if (moved) {
              try { this.ensureFavThumb(moved); } catch (err) {}
            }
            this.saveFavorites();
          }
        }
      }
      this.dragging = false;
      this.dragIndex = null;
      this.dragItem = null;
      this.placeholderIndex = null;
      this.dragListRect = null;
      this.placeholderStyle = {};
      this.dragSourceTabId = null;
      this.dragHoverTabIndex = null;
      this.clearTabHoverTimer();
      this.detachDragListeners();
      this.unlockPageTouchScroll();
      if (inside && movedId) {
        this.markRecentlyMoved(movedId);
        this.$nextTick(() => {
          const listEl = this.favoritesListEl();
          if (!listEl) return;
          const maxScroll = Math.max(0, (listEl.scrollHeight || 0) - (listEl.clientHeight || 0));
          const next = Math.max(0, Math.min(scrollTarget, maxScroll));
          if (Number.isFinite(next)) {
            listEl.scrollTop = next;
          }
        });
      }
    },
    markRecentlyMoved(id) {
      if (!id) return;
      this.recentlyMovedId = id;
      if (this.recentlyMovedTimer) {
        clearTimeout(this.recentlyMovedTimer);
      }
      this.recentlyMovedTimer = setTimeout(() => {
        this.recentlyMovedId = null;
        this.recentlyMovedTimer = null;
      }, 900);
    },
    normalizeTabItemsOrder(tab) {
      if (!tab || !Array.isArray(tab.items)) return;
      tab.items
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .forEach((item, idx) => { item.order = idx + 1; });
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
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 24px 32px 20px;
  box-sizing: border-box;
  background-color: #f5f5f7;
  width: 100%;
}

.page-header {
  flex: 0 0 auto;
  text-align: center;
  margin-bottom: 16px;
  width: 100%;
  max-width: 520px;
  margin-left: auto;
  margin-right: auto;
}

.header-content {
  width: 100%;
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

/* 填充满整个屏幕的主体收藏菜单：桌面端限制宽度在520px并居中 */
.favorites-full-menu {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 18px 24px 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* 选项卡：固定在菜单上方，不随列表滚动 */
.fav-tabs-wrap {
  flex: 0 0 auto;
  margin: 0 0 12px;
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

/* 列表容器：唯一纵向滚动区域（仅景点列表项及以下部分滚动） */
.favorites-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: 4px 6px 90px 4px;
  box-sizing: border-box;
}

.favorites-list::-webkit-scrollbar {
  width: 6px;
}

.favorites-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.favorites-list::-webkit-scrollbar-track {
  background: transparent;
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

.fav-move-enter-active,
.fav-move-leave-active,
.fav-move-move {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.fav-move-leave-active {
  position: absolute;
  left: 0;
  right: 0;
}
.fav-move-enter-from,
.fav-move-leave-to {
  opacity: 0;
  transform: translateY(6px);
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

/* 返回按钮样式：与景点列表页面完全一致 */
.back-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: linear-gradient(135deg, #007aff 0%, #0056cc 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
  position: relative;
  overflow: hidden;
  margin-bottom: 0;
  clip-path: polygon(20px 0, 100% 0, 100% 100%, 20px 100%, 0 50%);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.back-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.back-button:hover::before {
  left: 100%;
}

.back-button:hover {
  background: linear-gradient(135deg, #0056cc 0%, #004bb5 100%);
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 122, 255, 0.4);
}

.back-button:active {
  transform: translateY(-1px) scale(0.98);
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
}

/* 左下角固定返回按钮 */
.bottom-left-back-btn {
  position: fixed;
  left: 48px;
  bottom: calc(48px + env(safe-area-inset-bottom, 0px));
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
    padding: calc(36px + env(safe-area-inset-top, 0px)) 14px calc(16px + env(safe-area-inset-bottom, 0px));
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }
  .page-header {
    margin-bottom: 16px;
    max-width: 100%;
  }
  .page-title {
    font-size: 2.25rem;
    line-height: 1.2;
  }
  .favorites-full-menu {
    max-width: 100%;
    border-radius: 16px;
    padding: 14px 14px 0;
    min-height: 0;
  }
  .fav-tabs-wrap {
    margin-bottom: 10px;
  }
  .favorites-list {
    padding-bottom: 80px;
  }
  .back-button {
    padding: 11px 16px;
    font-size: 14px;
    gap: 0;
  }
  .bottom-left-back-btn {
    left: 20px;
    bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  }
}

@media (max-width: 480px) {
  .favorites-page-container {
    padding: calc(32px + env(safe-area-inset-top, 0px)) 10px calc(14px + env(safe-area-inset-bottom, 0px));
  }
  .page-title {
    font-size: 2.05rem;
    line-height: 1.2;
  }
  .favorites-full-menu {
    padding: 12px 10px 0;
  }
}
</style>
