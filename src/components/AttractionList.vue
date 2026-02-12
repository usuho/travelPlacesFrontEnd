<template>
  <div class="container fade-in">
    <!-- 固定顶部区域（标题 + 筛选器） -->
    <div class="fixed-header">
      <header class="page-header">
        <div class="header-content">

          <div class="title-text-group">
            <h1
              class="page-title title-hero"
              :style="pageTitleFlagStyle"
            >
              {{ translateCountry(country) }}
            </h1>
            <h1 class="title-hero title-english" style="text-transform: uppercase;">
              {{ country }}
            </h1>
          </div>
          
          <p class="page-subtitle">{{translateCountry(country)}}受欢迎的旅行目的地</p>
        </div>
      </header>


      <div class="filters-section card desktop-filters">
        
        <!-- 这里是你原来的筛选器内容 -->
        <div class="filters-grid">
          <div class="filter-group">
            <label for="minReviews">最小评论数</label>
            <input 
              type="number" 
              v-model.number="minReviews" 
              @keyup.enter="validateInputmin" 
              @blur="validateInputmin" 
              min="0" 
              id="minReviews"
              placeholder="0" 
            />
          </div>
          
          <div class="filter-group">
            <label for="order">排序方式</label>
            <select v-model="order" id="order">
              <option value="rating_desc">好评率『最高』</option>
              <option value="rating_asc">好评率『最低』</option>
              <option value="reviews_desc">评论数『最多』</option>
              <option value="reviews_asc">评论数『最少』</option>
              <option value="positive_desc">好评数『最多』</option>
              <option value="positive_asc">好评数『最少』</option>
              <option v-if="distanceSortAvailable" value="distance_near">距离『最近』</option>
            </select>
          </div>
          
          <div class="filter-group" v-if="countisLoaded && countis.length > 0">
            <label for="county">{{translateCounty(country)}}</label>
              <select v-model="selectedCounty" id="county">
                <option value="">所有{{translateCounty(country)}}</option>
                <option v-for="county in countis" :key="county" :value="county">{{ county }}</option>
              </select>
          </div>
          
          <div class="filter-group">
            <label for="region">区域</label>
              <select v-model="selectedRegion" id="region">
                <option value="">所有区域</option>
                <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
              </select>
          </div>
        </div>

        <!-- 第二行：仅放两个搜索框，与上面列对齐 -->
        <div class="filters-grid" style="margin-top: 12px;">
          <div class="filter-group">
            <!-- 桌面：第二行第一列，左右平分按钮 -->
            <div class="button-pair">
              <button class="map-button" @click="openMapMode">
                <span class="label-desktop">地图模式</span>
                <span class="label-mobile">地图</span>
              </button>
              <button
                ref="favoritesButtonDesktop"
                class="favorites-button"
                @click="toggleFavoritesMenu"
                title="查看收藏列表"
              >
                <span class="label-desktop">收藏列表</span>
                <span class="label-mobile">收藏</span>
                <span v-if="favorites.length">（{{ favorites.length }}）</span>
              </button>
            </div>
          </div>

          <!-- ✅ 新增：景点搜索框 -->
          <div class="filter-group">
            <div class="search-container">
              <input 
                type="search" 
                v-model="attractionSearch" 
                placeholder="搜索景点..." 
                class="search-input"
                ref="attractionInput"
                @input="filterAttractions(); updateAttractionDropdownPosition()"
                @focus="showAttractionSuggestions = true; updateAttractionDropdownPosition()"
                @blur="hideAttractionSuggestions"
              />
              
              <teleport to="body">
                <div 
                  v-if="showAttractionSuggestions && attractionSearch.trim() && attractionSuggestions.length > 0"
                  class="suggestions-dropdown" 
                  :style="attractionDropdownStyle"
                >
                  <div 
                    v-for="item in attractionSuggestions" 
                    :key="item.id" 
                    class="suggestion-item"
                    @mousedown="selectAttraction(item)"
                  >
                    {{ item.name }}
                  </div>
                </div>
              </teleport>
            </div>
          </div>

          <div class="filter-group" v-if="countisLoaded && countis.length > 0">
            <div class="search-container">
              <input 
                type="search" 
                v-model="countySearch" 
                :placeholder="`搜索${translateCounty(country)}...`"
                class="search-input"
                ref="countyInput"
                @input="filterCounties; updateCountyDropdownPosition()"
                @focus="showCountySuggestions = true; updateCountyDropdownPosition()"
                @blur="hideCountySuggestions"
              />
              <teleport to="body">
                <div v-if="showCountySuggestions && countySearch.trim() && countySuggestions.length > 0" class="suggestions-dropdown" :style="countyDropdownStyle">
                  <div 
                    v-for="county in countySuggestions" 
                    :key="county" 
                    class="suggestion-item"
                    @mousedown="selectCounty(county)"
                  >
                    {{ county }}
                  </div>
                </div>
              </teleport>
            </div>
          </div>
          <div class="filter-group">
            <div class="search-container">
              <input 
                type="search" 
                v-model="regionSearch" 
                placeholder="搜索区域..."
                class="search-input"
                ref="regionInput"
                @input="filterRegions; updateRegionDropdownPosition()"
                @focus="showRegionSuggestions = true; updateRegionDropdownPosition()"
                @blur="hideRegionSuggestions"
              />
              <teleport to="body">
                <div v-if="showRegionSuggestions && regionSearch.trim() && regionSuggestions.length > 0" class="suggestions-dropdown" :style="regionDropdownStyle">
                  <div 
                    v-for="region in regionSuggestions" 
                    :key="region" 
                    class="suggestion-item"
                    @mousedown="selectRegion(region)"
                  >
                    {{ region }}
                  </div>
                </div>
              </teleport>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 滚动内容区域 -->
    <div class="scroll-content">

      <!-- 移动端筛选器 -->
      <div class="filters-section card mobile-filters">
        <div class="mobile-filters-grid">
          <!-- 第一行：最小评论数 -->
          <div class="mobile-filter-row">
            <span class="filter-label">最小评论数</span>
            <!-- 移动：第一行第二列放置最小评论数输入 -->
            <input type="number" v-model.number="minReviews" @keyup.enter="validateInputmin" @blur="validateInputmin" min="0" placeholder="0" />
            <!-- 移动：第一行第三列放置按钮对（左右平分） -->
            <div class="button-pair">
              <button class="map-button" @click="openMapMode">
                <span class="label-desktop">地图模式</span>
                <span class="label-mobile">地图</span>
              </button>
              <button
                ref="favoritesButtonMobile"
                class="favorites-button"
                @click="toggleFavoritesMenu"
                title="查看收藏列表"
              >
                <span class="label-desktop">收藏列表</span>
                <span class="label-mobile">收藏</span>
                <span v-if="favorites.length">{{'('+ favorites.length+')' }}</span>
              </button>
            </div>
          </div>

          <!-- 第二行：排序方式 + 景点搜索 -->
          <div class="mobile-filter-row">

            <span class="filter-label">排序方式</span>
            <select v-model="order">
              <option value="rating_desc">好评率『最高』</option>
              <option value="rating_asc">好评率『最低』</option>
              <option value="reviews_desc">评论数『最多』</option>
              <option value="reviews_asc">评论数『最少』</option>
              <option value="positive_desc">好评数『最多』</option>
              <option value="positive_asc">好评数『最少』</option>
              <option v-if="distanceSortAvailable" value="distance_near">距离『最近』</option>
            </select>
            <input
              type="search"
              v-model="attractionSearch"
              placeholder="搜索景点..."
              ref="mobileAttractionInput"
              @input="filterAttractions(); updateMobileAttractionDropdownPosition()"
              @focus="showAttractionSuggestions = true; updateMobileAttractionDropdownPosition()"
              @blur="hideAttractionSuggestions"
            />
          </div>

          <teleport to="body">
              <div 
                v-if="showAttractionSuggestions && attractionSearch.trim() && attractionSuggestions.length > 0"
                class="suggestions-dropdown" 
                :style="mobileAttractionDropdownStyle"
              >
                <div 
                  v-for="item in attractionSuggestions" 
                  :key="item.id" 
                  class="suggestion-item"
                  @mousedown="selectAttraction(item)"
                >
                  {{ item.name }}
                </div>
              </div>
            </teleport>

          <!-- 第三行：county -->
          <div class="mobile-filter-row" v-if="countisLoaded && countis.length > 0">
            <span class="filter-label">{{translateCounty(country)}}</span>
            <select v-model="selectedCounty">
              <option value="">所有{{translateCounty(country)}}</option>
              <option v-for="county in countis" :key="county" :value="county">{{ county }}</option>
            </select>
            <input 
              type="search" 
              v-model="countySearch" 
              :placeholder="`搜索${translateCounty(country)}...`"
              ref="mobileCountyInput"
              @input="filterCounties(); updateMobileCountyDropdownPosition()"
              @focus="showCountySuggestions = true; updateMobileCountyDropdownPosition()"
              @blur="hideCountySuggestions"
            />

            <teleport to="body">
              <div v-if="showCountySuggestions && countySearch.trim() && countySuggestions.length > 0" 
                  class="suggestions-dropdown" 
                  :style="mobileCountyDropdownStyle">
                <div 
                  v-for="county in countySuggestions" 
                  :key="county" 
                  class="suggestion-item"
                  @mousedown="selectCounty(county)"
                >
                  {{ county }}
                </div>
              </div>
            </teleport>

          </div>

          <!-- 第四行：区域 -->
          <div class="mobile-filter-row">
            <span class="filter-label">区域</span>
            <select v-model="selectedRegion">
              <option value="">所有区域</option>
              <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
            </select>
            <input 
              type="search" 
              v-model="regionSearch" 
              placeholder="搜索区域..."
              ref="mobileRegionInput"
              @input="filterRegions(); updateMobileRegionDropdownPosition()"
              @focus="showRegionSuggestions = true; updateMobileRegionDropdownPosition()"
              @blur="hideRegionSuggestions"
            />

            <teleport to="body">
              <div v-if="showRegionSuggestions && regionSearch.trim() && regionSuggestions.length > 0" 
                  class="suggestions-dropdown" 
                  :style="mobileRegionDropdownStyle">
                <div 
                  v-for="region in regionSuggestions" 
                  :key="region" 
                  class="suggestion-item"
                  @mousedown="selectRegion(region)"
                >
                  {{ region }}
                </div>
              </div>
            </teleport>


          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">正在加载景点数据...</p>
      </div>

      <!-- 景点列表 -->
      <div v-if="!loading" class="attractions-section">
        <div v-if="attractions.length === 0" class="empty-state">
          <div class="empty-icon">🏞️</div>
          <h3>暂无景点数据</h3>
          <p>请尝试调整筛选条件</p>
        </div>
        
        <div
          v-else
          class="attractions-list attractions-list-desktop"
          :key="listRenderKey"
          v-fly-in
          :style="swipeStyle"
          @touchstart="swipeEnabled && onListSwipeStart($event)"
          @touchmove="swipeEnabled && onListSwipeMove($event)"
          @touchend="swipeEnabled && onListSwipeEnd($event)"
          @touchcancel="swipeEnabled && onListSwipeCancel($event)"
        >
          <div
            v-for="(attraction, index) in attractions"
            :key="attraction.id"
            class="attraction-item"
            :class="{ favorited: isFavorited(attraction.id), pending: isPendingFavorite(attraction.id) }"
            tabindex="0"
            @click="handleClick(attraction,index,$event)"
            @mousedown.prevent="startCardPress(attraction, $event)"
            @mouseup.prevent="endCardPress"
            @mouseleave="cancelCardPress"
            @touchstart="startCardPress(attraction, $event)"
            @touchmove="onCardTouchMove"
            @touchend="endCardPress"
            @touchcancel="cancelCardPress"
            @contextmenu.prevent
          >
            <div class="attraction-image-wrapper attraction-content-desktop">
              <div v-if="!attraction.image1" class="image-placeholder shimmer"></div>
              <img v-fade-in
                v-if="attraction.image1"
                :src="attraction.image1"
                alt="景点图片" 
                class="attraction-image"
               />
            </div>
            
            <div class="attraction-content attraction-content-desktop">
              <div class="attraction-header">
                <h3 class="attraction-name">
                  <span class="attraction-name-text">{{ attraction.name }}</span>
                </h3>
                <div class="attraction-location">
                  <span class="location-icon">📍</span>
                  <span>{{ attraction.region }}  {{ attraction.county }}</span>
                </div>
              </div>
              
              <div class="attraction-stats">
                <div class="stat-item">
                  <span class="stat-number">{{ attraction.total_reviews }}</span>
                  <span class="stat-label">总评论</span>
                </div>
                <div class="stat-item">
                  <span class="stat-number">{{ attraction.positive_reviews }}</span>
                  <span class="stat-label">好评数</span>
                </div>
                <div class="stat-item rating-item">
                  <span class="stat-number rating-number" :style="{ backgroundColor: getRatingColor(attraction.rating) }">{{ attraction.rating }}</span>
                  <span class="stat-label">好评率</span>
                </div>
              </div>
            </div>

            <!-- 移动端内容布局 -->
            <div class="attraction-content-mobile">
              <!-- ✅ 第一行：名字 + 位置 同行显示 -->
              <div class="attraction-header-mobile">
                <h3 class="attraction-name">{{ attraction.name }}</h3>
                <div class="attraction-location">
                  <span class="location-icon">📍</span>
                  <span class="location-text">{{ attraction.region }}  {{ attraction.county }}</span>
                </div>
              </div>

              <!-- 第二行：左图片，右文字 -->
              <div class="attraction-info-row">
                <div class="attraction-image-wrapper">
                  <img v-fade-in v-if="attraction.image1" :src="attraction.image1" alt="景点图片" class="attraction-image" />
                  <div v-else class="image-placeholder shimmer"></div>
                </div>

                <div class="attraction-stats-wrapper">
                  <div class="attraction-stats">
                    <div class="stat-item rating-item">
                      <span class="stat-number rating-number" :style="{ backgroundColor: getRatingColor(attraction.rating) }">{{ attraction.rating }}</span>
                      <span class="stat-label">好评率</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页控制 -->
      <div v-if="!loading && attractions.length > 0" class="pagination-section">
        <div class="pagination-controls">
          <button @click="goBack" class="back-button bottom-back-button">
            返回
          </button>
          
          <button @click="prevPage" :disabled="page === 1" class="pagination-button">
            上一页
          </button>
          
                  <div class="page-input-group">
                    <label for="gotoPage">跳转到</label>
                    <input 
                      type="number" 
                      v-model.number="gotoPage" 
                      @keyup.enter="validateInput"
                      @blur="validateInput"
                      id="gotoPage" 
                      :max="totalPages" 
                      :min="1" 
                      placeholder="页码"
                    />
                  </div>
          
          <button @click="nextPage" :disabled="page === totalPages" class="pagination-button">
            下一页
          </button>
        </div>
        
        <div class="pagination-info">
          <span>第 {{ page }} 页，共 {{ totalPages }} 页</span>
        </div>
      </div>
    </div>
    <!-- 收藏菜单（浮层） -->
    <teleport to="body">
      <div
        v-if="showFavorites"
        ref="favoritesMenu"
        class="favorites-menu"
        :style="favoritesMenuStyle"
        @contextmenu.prevent
      >
        <!-- Tabs: replace plain title with horizontally scrollable tabs -->
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
                    :ref="'tabEdit_'+tab.id"
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
        <!-- Tab drag ghost -->
        <div v-if="tabDragging && tabDragItem" class="tab-ghost"
             :style="{ position: 'fixed', top: (tabGhostTop) + 'px', left: (tabGhostLeft) + 'px', width: (tabGhostWidth || 40) + 'px' }">
          {{ tabDragItem.name }}
        </div>
        <transition-group
          ref="favoritesList"
          name="fav-move"
          tag="div"
          class="favorites-list"
          :style="favoritesListInlineStyle"
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
              <div :class="['fav-right-actions', { visible: isFavRightActionsVisible(node.f) }]">
                <button class="fav-pending" :class="{ active: !!(node.f && node.f.pending) }" @click.stop="togglePending(node.f)">{{ node.f && node.f.pending ? "取消" : "待定" }}</button>
              </div>
              <div :class="['fav-left-actions', { visible: isFavActionsVisible(node.f) }]">
                <button class="fav-delete" @click.stop="removeFavorite(node.f)">{{ String(node.f && node.f.country) === 'custom' ? '删除' : '移除' }}</button>
              </div>
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
                <span
                  v-if="node.f && String(node.f.country) !== 'custom' && node.f.rating !== undefined && node.f.rating !== null && node.f.rating !== ''"
                  class="fav-rating"
                  :style="{ backgroundColor: getRatingColor(node.f.rating) }"
                >{{ node.f && node.f.rating }}</span>
              </div>
            </template>
          </div>
          <!-- 新增：创建自创景点的 + 项（位于清空收藏上方） -->
          <div key="fav-add" class="favorites-add" @click.stop="showCreateModal = true" title="创建景点">
            <div class="plus-circle">+</div>
          </div>
          <!-- 新增：导入/导出按钮行（位于 + 项下方，清空收藏上方）；当列表为空时隐藏 -->
          <div key="fav-actions" class="favorites-actions-row">
            <button class="favorites-action-btn" @click.stop="onImportClick">导入</button>
            <button class="favorites-action-btn primary" @click.stop="promptExportFavorites">导出</button>
            <!-- 隐藏的文件输入用于读取 -->
            <input
              ref="importFileInput"
              type="file"
              accept=".json,application/json,application/*+json,text/json,text/plain"
              class="hidden-file-input"
              @change="handleImportFile"
            />
          </div>
          <!-- 删除收藏列表操作（与拖出选项卡删除一致）；空白时也显示，且放入可滚动列表中 -->
          <div key="fav-clear" class="favorites-clear" @click="promptClearFavorites">
            🗑️ 删除收藏
          </div>
        </transition-group>
        <!-- 跟随手指/鼠标的拖拽项 -->
        <div
          v-if="dragging && dragItem"
          :style="{
            position: 'fixed',
            top: (dragY - dragOffsetY) + 'px',
            left: (favoritesMenuStyle.left || '0'),
            width: favoritesMenuStyle.width || '320px',
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
      </div>
      <div
        v-if="showFavorites"
        class="favorites-backdrop"
        @mousedown.prevent.stop="onFavoritesBackdropClick"
        @touchstart.prevent.stop="onFavoritesBackdropClick"
      ></div>
    </teleport>
    <!-- 创建自创景点弹窗 -->
    <CreateAttractionModal v-model="showCreateModal" :county-label="translateCounty(country)" @created="onCustomCreated" />

    <!-- 导出回退弹窗（适配部分移动端浏览器如锤子浏览器） -->
    <teleport to="body">
      <div v-if="showExportModal" class="confirm-backdrop" @click="closeExportFallback">
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-message">
            某些浏览器不支持直接保存文件。你可以复制内容或在新页面打开后通过“分享/保存到文件”。
          </div>
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

    <!-- Import Paste Dialog -->
    <teleport to="body">
      <div v-if="showImportPaste" class="confirm-backdrop" @click="cancelImportPaste">
        <div class="confirm-dialog has-close" @click.stop>
          <button class="confirm-close" aria-label="关闭" @click="cancelImportPaste">×</button>
          <div class="confirm-message">
            无法读取所选文件，请粘贴json文件内文本导入
          </div>
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

    <!-- Export Choice Dialog -->
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

    <!-- Exporting Progress Dialog -->
    <teleport to="body">
      <div v-if="exporting" class="confirm-backdrop" @click.stop>
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-message">
            <div class="export-progress-header">
              <span class="export-progress-text">正在导出收藏，请稍候...</span>
              <span
                class="export-progress-count"
                v-if="exportTotal"
              >
                {{ exportProgress }} / {{ exportTotal }}
              </span>
            </div>
            <div
              class="export-progress-bar"
              v-if="exportTotal"
            >
              <div
                class="export-progress-fill"
                :style="{
                  width: Math.min(100, Math.max(0, (exportProgress / exportTotal) * 100)) + '%'
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Delete Tab Confirm Dialog -->
    <teleport to="body">
      <div v-if="tabDeleteConfirmVisible" class="confirm-backdrop" @click="cancelDeleteTab">
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-message">
            确定要<span class="danger-word">删除</span>该收藏吗？
          </div>
          <div class="confirm-actions">
            <button class="btn-cancel" @click="cancelDeleteTab">取消</button>
            <button class="btn-danger" @click="performDeleteTab">删除</button>
          </div>
        </div>
      </div>
    </teleport>
    <!-- Delete Favorite Item Confirm Dialog -->
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

    <!-- 桌面端收藏项右键菜单 -->
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
  import CreateAttractionModal from './CreateAttractionModal.vue'
  import { findCustomAttractionById, deleteCustomAttraction, saveAllCustomAttractions } from '../utils/customAttractions.js'
  import { getImageUrl as getCustomImageUrl, deleteImagesForId as deleteCustomImagesForId, setImage as setCustomImage } from '../utils/customImageStore.js'
  import { withBackendApiKey, fetchAttractionsPositionsByIds } from '../utils/geoApi.js';
  import { ensureUserDataHydrated, queueUserDataSync, deleteCustomImages } from '../stores/userDataSync.js'
  import { invalidateAttractionMapCache } from '../stores/attractionMapCache.js'
  import { Capacitor } from '@capacitor/core';
  import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
  import { Converter } from 'opencc-js';

  export default {
    components: { CreateAttractionModal },
    data() {
      return {
          // 收藏相关
          favorites: [], // points to active tab's items
          // Tabs for 收藏列表
          favoriteTabs: [],
          activeTabId: null,
          editingTabId: null,
          editingTabName: '',
          tabEditingComposing: false,
          // Tab drag state
          tabPressTimer: null,
          tabLongPressThreshold: 300,
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
          // Tabs auto-scroll during drag
          tabAutoScrollFrame: null,
          tabAutoScrollVelocity: 0,
          tabAutoScrollMode: null,
          tabStartScrollLeft: 0,
          tabDeleteConfirmVisible: false,
          tabDeleteTargetId: null,
          // 自创景点删除确认（收藏项）
          itemDeleteConfirmVisible: false,
          itemDeleteTarget: null,
          showFavorites: false,
          favoritesMenuStyle: {},
          favoritesListStyle: {},
          favThumbs: {},
          favoritesContextMenuVisible: false,
          favoritesContextMenuStyle: {},
          favoritesContextMenuTarget: null,
          favoritesContextMenuOutsideHandler: null,
          favoritesContextMenuDismissHandler: null,
          favoritesContextMenuInteractionLock: false,
          favoritesContextMenuLockTimer: null,
          pageScrollLocked: false,
          bodyOverflowBackup: null,
          bodyTouchActionBackup: null,
          // 自创景点弹窗
        showCreateModal: false,
        // 导出回退（适配部分移动端如锤子浏览器）
        showExportModal: false,
        showExportChoice: false,
        exportJsonText: '',
        exportFileName: '',
        exportDataUrl: '',
        exporting: false,
        exportProgress: 0,
        exportTotal: 0,
        exportHasImages: false,
        // 导入失败改为粘贴方式
        showImportPaste: false,
        importPasteText: '',
        // 长按相关（卡片）
        pressTimer: null,
        longPressThreshold: 500,
        suppressNextClick: false,
        // 拖拽相关（收藏菜单内）
        dragging: false,
        dragIndex: null,
        dragItem: null,
        dragY: 0,
        dragX: 0,
        dragOffsetY: 0,
        dragListRect: null,
        dragBoundaries: [],
        placeholderStyle: {},
        placeholderIndex: null,
        dragActivatedTabId: null,
        dragOriginalTabId: null,
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
        recentlyMovedId: null,
        recentlyMovedTimer: null,
        // 收藏项右滑删除
        favActionId: null,
        favSwipeItemId: null,
        favSwipeStartX: 0,
        favSwipeStartY: 0,
        favSwipeActive: false,
        favSwipeThreshold: 24,
        favSwipeOffsetX: 0,
        favSwipeMaxReveal: 56,
        // 收藏项左滑待定
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
        // 点击穿透保护（关闭收藏菜单后短时间屏蔽卡片点击）
        clickGuard: false,
        clickGuardTimer: null,
        renameSaveTimer: null,
        // 页面横向滑动分页
        swipeStartX: 0,
        swipeStartY: 0,
        swipeTracking: false,
        swipeDirection: null,
        swipeEligible: false,
        swipeProgress: 0,
        swipeOpacity: 1,
        swipeResetting: false,
        swipeTriggerDistance: 140,
        swipeCanTrigger: false,
        swipeResetTimer: null,
        swipeEnabled: false,
        // 卡片触摸相关
        cardTouchStartX: 0,
        cardTouchStartY: 0,
        cardTouchMoved: false,
        cardTouchTolerance: 8,
        mobileCountyDropdownStyle: {},
        mobileRegionDropdownStyle: {},
        mobileAttractionDropdownStyle: {},
        countisLoaded: false,
        country: this.$route.params.country,
        attractions: [],
        loading: true,
        // 恢复本地状态的守护标志，避免 watch 在初始化时重置
        isRestoring: false,
        minReviews: parseInt(localStorage.getItem('attractionMinReviews')) || null, 
        order: localStorage.getItem('attractionsOrder') ||'rating_desc', 
        page: parseInt(localStorage.getItem('attractionsPage')) || 1,
        limit: 20,
        total: 0,
        gotoPage: null,

        countryTranslations: {
          japan: '日本',
          china: '中国',
          singapore: '新加坡',
          malaysia: '马来西亚',
          brunei: '文莱',
          thailand: '泰国',
          vietnam: '越南',
          switzerland: '瑞士',
          andorra: '安道尔',
          liechtenstein: '列支敦士登',
          malta: '马耳他',
          monaco: '摩纳哥',
          poland: '波兰',
          sanmarino: '圣马力诺',
          slovenia: '斯洛文尼亚',
          france: '法国',
          germany: '德国',
          uk: '英国',
          ireland: '爱尔兰',
          spain: '西班牙',
          italy: '意大利',
          portugal: '葡萄牙',
          netherlands: '荷兰',
          sweden: '瑞典',
          norway: '挪威',
          austria: '奥地利',
          belgium: '比利时',
          finland: '芬兰',
          luxembourg: '卢森堡',
          hungary: '匈牙利',
          czech: '捷克',
          slovakia: '斯洛伐克',
          greece: '希腊',
          croatia: '克罗地亚',
          lithuania: '立陶宛',
          latvia: '拉脱维亚',
          estonia: '爱沙尼亚',
          korea: '韩国',
          indonesia: '印度尼西亚',
          srilanka: '斯里兰卡',
          maldives: '马尔代夫',
          argentina: '阿根廷',
          uruguay: '乌拉圭',
          brazil: '巴西',
          paraguay: '巴拉圭',
          peru: '秘鲁',
          chile: '智利',
          bolivia: '玻利维亚',
          colombia: '哥伦比亚',
          morocco: '摩洛哥',
          egypt: '埃及',
          southafrica: '南非',
          madagascar: '马达加斯加',
          israel: '以色列',
          turkey: '土耳其',
          saudiarabia: '沙特阿拉伯',
          uae: '阿联酋',
          qatar: '卡塔尔',
          america: '美国',
          canada: '加拿大',
          mexico: '墨西哥',
          iceland: '冰岛',
          denmark: '丹麦',
          australia: '澳大利亚',
          newzealand: '新西兰'
          // 可以添加更多国家的翻译
        },

        countyTranslations: {
          japan: '都/道/府/县',
          china: '省份',
          america: '州/领地',
          canada: '省份/地区',
          mexico: '州',
          australia: '州/领地',
        },

        selectedRegion: localStorage.getItem('attractionsRegion')||'',
        selectedCounty: localStorage.getItem('attractionsCounty')||'',
        regions: [],
        countis: [],
        // 映射：处理后的值 -> 原始值数组（用于API调用）
        countyValueMap: new Map(), // 处理后的值 -> [原始值1, 原始值2, ...]
        regionValueMap: new Map(), // 处理后的值 -> [原始值1, 原始值2, ...]
        countySearch: '',
        regionSearch: '',
        filteredCounties: [],
        filteredRegions: [],
        showCountySuggestions: false,
        showRegionSuggestions: false,
        countyDropdownStyle: {},
        regionDropdownStyle: {},

        attractionSearch: '',
        showAttractionSuggestions: false,
        attractionDropdownStyle: {},
        allAttractions: [],
        attractionSuggestions: [],
        distanceSortAvailable: false,
        distanceQueue: null,
        listRenderTick: 0,
        fetchRetryDelay: 2000,
        activeFetchToken: 0,
        maxFetchRetries: 5,
      };
    },

    computed: {
      listRenderKey() {
        return `${this.order || 'rating_desc'}-${this.page || 1}-${this.listRenderTick}`;
      },
      totalPages() {
        return Math.ceil(this.total / this.limit);
      },
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
      
      countySuggestions() {
        if (!this.countySearch.trim()) return [];
        const q = this.countySearch.toLowerCase();
        return this.countis.filter(c => c && c.toLowerCase().includes(q));
      },
      regionSuggestions() {
        if (!this.regionSearch.trim()) return [];
        const q = this.regionSearch.toLowerCase();
        return this.regions.filter(r => r && r.toLowerCase().includes(q));
      },
      swipeStyle() {
        return {
          opacity: this.swipeOpacity,
          transition: this.swipeResetting ? 'opacity 0.2s ease' : 'none',
        };
      },
      favoritesListInlineStyle() {
        const base =
          this.favoritesListStyle && typeof this.favoritesListStyle === 'object'
            ? this.favoritesListStyle
            : {};
        const style = { ...base };
        if (this.dragging) {
          style.overflowY = 'hidden';
          style.WebkitOverflowScrolling = 'auto';
          style.overscrollBehavior = 'contain';
          style.touchAction = 'none';
        }
        return style;
      },

      countryFlagUrl() {
        const map = {
          japan: 'jp',
          china: 'cn',
          singapore: 'sg',
          malaysia: 'my',
          brunei: 'bn',
          thailand: 'th',
          vietnam: 'vn',
          switzerland: 'ch',
          andorra: 'ad',
          liechtenstein: 'li',
          malta: 'mt',
          monaco: 'mc',
          poland: 'pl',
          sanmarino: 'sm',
          slovenia: 'si',
          france: 'fr',
          germany: 'de',
          uk: 'gb',
          ireland: 'ie',
          spain: 'es',
          italy: 'it',
          portugal: 'pt',
          netherlands: 'nl',
          sweden: 'se',
          norway: 'no',
          austria: 'at',
          belgium: 'be',
          finland: 'fi',
          luxembourg: 'lu',
          hungary: 'hu',
          czech: 'cz',
          slovakia: 'sk',
          greece: 'gr',
          croatia: 'hr',
          lithuania: 'lt',
          latvia: 'lv',
          estonia: 'ee',
          korea: 'kr',
          indonesia: 'id',
          srilanka: 'lk',
          maldives: 'mv',
          argentina: 'ar',
          uruguay: 'uy',
          brazil: 'br',
          paraguay: 'py',
          peru: 'pe',
          chile: 'cl',
          bolivia: 'bo',
          colombia: 'co',
          morocco: 'ma',
          egypt: 'eg',
          southafrica: 'za',
          madagascar: 'mg',
          israel: 'il',
          turkey: 'tr',
          saudiarabia: 'sa',
          uae: 'ae',
          qatar: 'qa',
          america: 'us',
          canada: 'ca',
          mexico: 'mx',
          iceland: 'is',
          denmark: 'dk',
          australia: 'au',
          newzealand: 'nz'
        };
        const key = String(this.country || '').toLowerCase();
        const code = map[key];
        if (!code) return null;
        return `/flags/${code}.png`;
      },

      pageTitleFlagStyle() {
        if (!this.countryFlagUrl) return {};
        return {
          '--title-hero-base': `url('${this.countryFlagUrl}')`,
          '--title-hero-base-size': '100% auto',
          '--title-hero-base-position': 'center center'
        };
      }
    },
    async created() {
      try { await ensureUserDataHydrated(); } catch (e) {}
      this.ensureCountryState();
      this.isRestoring = true;
      // 进入列表页时再次从 localStorage 读取，避免 0 被默认值覆盖
      try { const vMin = localStorage.getItem('attractionMinReviews'); if (vMin !== null && vMin !== '') { const n = parseInt(vMin, 10); if (Number.isFinite(n)) this.minReviews = n; } } catch (e) {}
      try { const vOrder = localStorage.getItem('attractionsOrder'); if (vOrder !== null) this.order = vOrder; } catch (e) {}
      try { const vRegion = localStorage.getItem('attractionsRegion'); if (vRegion !== null) this.selectedRegion = vRegion; } catch (e) {}
      try { const vCounty = localStorage.getItem('attractionsCounty'); if (vCounty !== null) this.selectedCounty = vCounty; } catch (e) {}
      try { const vPage = localStorage.getItem('attractionsPage'); const n = parseInt(vPage, 10); if (Number.isFinite(n) && n > 0) this.page = n; } catch (e) {}
      try { const qp = this.$route && this.$route.query && this.$route.query.page; const n2 = parseInt(qp, 10); if (Number.isFinite(n2) && n2 > 0) this.page = n2; } catch (e) {}
      // 从 localStorage 恢复 countyValueMap
      try {
        const mapStr = localStorage.getItem('attractionsCountyValueMap');
        if (mapStr) {
          const mapArray = JSON.parse(mapStr);
          this.countyValueMap = new Map(mapArray);
        }
      } catch (e) {
        console.error('Failed to restore countyValueMap from localStorage:', e);
      }
      this.restoreDistanceQueueState();
      this.isRestoring = false;
      if (this.shouldResetListFiltersFromRoute()) {
        this.resetFiltersAndPagination(false);
        this.clearResetFiltersRouteFlag();
      }
      // 先获取countis和regions的映射，再调用fetchAttractions
      await this.fetchCountis();
      await this.fetchRegions();
      this.fetchAttractions(false);
      this.fetchAllAttractions();
      this.loadFavorites();
      // 确保自创景点收藏信息为最新
      try { this.refreshCustomFavorites(); this.saveFavorites(); } catch(e) {}
      this.resetSwipeState(true);
    },

    mounted() {
      try {
        const rootEl = this.$root && this.$root.$el;
        if (rootEl) {
          rootEl.style.opacity = '';
          rootEl.style.transform = '';
          rootEl.style.transition = '';
        }
      } catch (e) {}

      this.updateSwipeEnabled();
      try {
        window.addEventListener('resize', this.updateSwipeEnabled, { passive: true });
      } catch (e) {}
      // 浏览器/手机后退键与页面“返回”按钮一致：一律回到首页（国家选择）
      try {
        // disabled: do not intercept browser/phone back on list page
        // history.pushState({ listBackGuard: true }, document.title, location.href);
        this._onListBack = (evt) => {
          try { evt && evt.preventDefault && evt.preventDefault(); } catch(e) {}
          this.goBack();
        };
        // disabled: do not add popstate interception on list page
        // window.addEventListener('popstate', this._onListBack, { passive: true });
      } catch (e) {}
      // 安卓实体返回键：走与蓝色“返回”按钮一致的逻辑
      try {
        this._onHardwareBack = (evt) => {
          try { evt && evt.preventDefault && evt.preventDefault(); } catch (e) {}
          this.goBack();
        };
        window.addEventListener('hardware-back', this._onHardwareBack);
      } catch (e) {}
    },

    watch: {
      // 移除在输入时立即触发的行为

      '$route.params.country'(next, prev) {
        if (String(next) === String(prev)) return;
        this.country = next;
        this.ensureCountryState();
        this.isRestoring = true;
        try {
          const vMin = localStorage.getItem('attractionMinReviews'); if (vMin !== null && vMin !== '') { const n = parseInt(vMin, 10); if (Number.isFinite(n)) this.minReviews = n; }
          const vOrder = localStorage.getItem('attractionsOrder'); if (vOrder !== null) this.order = vOrder;
          const vRegion = localStorage.getItem('attractionsRegion'); if (vRegion !== null) this.selectedRegion = vRegion; else this.selectedRegion = '';
          const vCounty = localStorage.getItem('attractionsCounty'); if (vCounty !== null) this.selectedCounty = vCounty; else this.selectedCounty = '';
          const vPage = localStorage.getItem('attractionsPage'); const n = parseInt(vPage, 10); this.page = Number.isFinite(n) && n > 0 ? n : 1;
        } catch (e) {
          this.minReviews = null;
          this.order = 'rating_desc';
          this.selectedRegion = '';
          this.selectedCounty = '';
          this.page = 1;
        }
        this.restoreDistanceQueueState();
        this.isRestoring = false;
        // 如果已经是按好评率最高排序，设置gotoPage的初始值为当前页（数据加载完成后会重新计算）
        if (this.order === 'rating_desc' && (this.gotoPage === null || this.gotoPage === undefined)) {
          this.gotoPage = this.page;
        }
        // 先获取countis和regions的映射，再调用fetchAttractions
        this.fetchCountis().then(() => {
          return this.fetchRegions();
        }).then(() => {
          this.fetchAttractions(false);
          this.fetchAllAttractions();
        });
      },

      order() {
        if (this.isRestoring) return;
        // 更改排序方式后，回到第 1 页
        this.page = 1;
        this.gotoPage = 1;
        localStorage.setItem('attractionsPage', this.page);
        localStorage.setItem('attractionsOrder', this.order);
        this.fetchAttractions(false);
      }, // **新增的watch**


      selectedRegion() {
        if (this.isRestoring) return;
        const resetByDistance = this.handleDistanceQueueResetOnFilters();
        this.page = 1;
        localStorage.setItem('attractionsPage', this.page); 
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        try { invalidateAttractionMapCache('filters:region'); } catch (e) {}
        if (!resetByDistance) {
          this.fetchAttractions(true);
        }
        this.fetchAllAttractions();},

      selectedCounty() {
        if (this.isRestoring) return;
        const resetByDistance = this.handleDistanceQueueResetOnFilters();
        this.selectedRegion = ''; // 重置区域
        localStorage.setItem('attractionsRegion', ''); // 保存到 localStorage 
        this.page = 1;
        localStorage.setItem('attractionsPage', this.page); 
        localStorage.setItem('attractionsCounty',this.selectedCounty);
        try { invalidateAttractionMapCache('filters:county'); } catch (e) {}
        // 先获取regions的映射，再调用fetchAttractions
        this.fetchRegions().then(() => {
          if (!resetByDistance) {
            this.fetchAttractions(true);
          }
          this.fetchAllAttractions();
        });
      },

      '$route.query.resetFilters'(next) {
        if (!next) return;
        this.handleResetFiltersRequest();
      },

      favorites: {
        handler() {
          if (this.showFavorites) {
            this.updateFavoritesListScroll();
          }
        },
        deep: true,
      },
      activeTabId() {
        const at = this.favoriteTabs.find(t => t.id === this.activeTabId);
        this.favorites = at ? at.items : [];
        this.normalizeFavoritesOrder();
      },

      showFavorites(val) {
        this.resetSwipeState(true);
        this.closeFavoritesContextMenu();
        if (val) {
          this.$nextTick(() => {
            this.updateFavoritesListScroll();
            this.scrollActiveTabIntoCenter(); // 打开时自动居中激活tab
          });
        } else {
          this.unlockPageTouchScroll();
          this.stopAutoScroll();
          this.favoritesListStyle = {};
          this.favActionId = null;
          this.favSwipeActive = false;
          this.favSwipeItemId = null;
          this.favSwipeOffsetX = 0;
          // 同步收起左滑待定
          this.favRightActionId = null;
          this.favRightSwipeItemId = null;
          this.favRightSwipeOffsetX = 0;
        this.favListTouchScrolling = false;
        this.setClickGuard();
        try {
          document.removeEventListener('mousedown', this.onOutsideClick, { capture: true });
          document.removeEventListener('touchstart', this.onOutsideClick, { capture: true });
            window.removeEventListener('resize', this.updateFavoritesMenuPosition);
            window.removeEventListener('scroll', this.updateFavoritesMenuPosition);
          } catch (e) {}
        }
      },


    },

    beforeUnmount() {
      this.activeFetchToken += 1;
      this.clearSwipeResetTimer();
      this.closeFavoritesContextMenu();
      this.unlockPageTouchScroll();
      if (this.clickGuardTimer) {
        clearTimeout(this.clickGuardTimer);
        this.clickGuardTimer = null;
      }
      if (this.favoritesContextMenuLockTimer) {
        clearTimeout(this.favoritesContextMenuLockTimer);
        this.favoritesContextMenuLockTimer = null;
      }
      if (this.recentlyMovedTimer) {
        clearTimeout(this.recentlyMovedTimer);
        this.recentlyMovedTimer = null;
      }
      this.favoritesContextMenuInteractionLock = false;
      try {
        window.removeEventListener('resize', this.updateSwipeEnabled);
        if (this._onListBack) window.removeEventListener('popstate', this._onListBack);
        if (this._onHardwareBack) window.removeEventListener('hardware-back', this._onHardwareBack);
      } catch (e) {}
    },

    methods: {
      ensureCountryState() {
        const current = String(this.country || '');
        let last = null;
        try { last = localStorage.getItem('lastAttractionsCountry'); } catch (e) {}
        const switched = last && String(last) !== current;
        const hasDistanceQueue = this.hasDistanceQueueForCountry(current);
        if (switched && !hasDistanceQueue) {
          // 跨国家切换时清理缓存，避免在中国/日本等大数据集之间互串
          this.minReviews = null;
          this.order = 'rating_desc';
          this.selectedRegion = '';
          this.selectedCounty = '';
          this.page = 1;
          this.gotoPage = null;
          this.distanceQueue = null;
          this.distanceSortAvailable = false;
          try { localStorage.removeItem('attractionMinReviews'); } catch (e) {}
          try { localStorage.setItem('attractionsOrder', 'rating_desc'); } catch (e) {}
          try { localStorage.removeItem('attractionsRegion'); } catch (e) {}
          try { localStorage.removeItem('attractionsCounty'); } catch (e) {}
          try { localStorage.setItem('attractionsPage', '1'); } catch (e) {}
          try { localStorage.removeItem('distanceBrowseQueue'); } catch (e) {}
        }
        try { localStorage.setItem('lastAttractionsCountry', current); } catch (e) {}
      },
      hasDistanceQueueForCountry(country) {
        try {
          const raw = localStorage.getItem('distanceBrowseQueue');
          if (!raw) return false;
          const obj = JSON.parse(raw);
          if (!obj || !obj.items || !obj.items.length) return false;
          return String(obj.country || '') === String(country);
        } catch (e) { return false; }
      },
      shouldResetListFiltersFromRoute() {
        try {
          const q = this.$route && this.$route.query ? this.$route.query : null;
          if (!q || typeof q.resetFilters === 'undefined' || q.resetFilters === null) return false;
          const flag = String(q.resetFilters).toLowerCase();
          return flag !== '0' && flag !== 'false' && flag !== '';
        } catch (e) {
          return false;
        }
      },
      clearResetFiltersRouteFlag() {
        try {
          if (!this.$route || !this.$route.query || typeof this.$route.query.resetFilters === 'undefined') return;
          const query = { ...(this.$route.query || {}) };
          delete query.resetFilters;
          if (this.$router) {
            this.$router.replace({ path: this.$route.path, query });
          }
        } catch (e) {}
      },
      resetFiltersAndPagination(triggerFetch = true) {
        const originalRestoring = this.isRestoring;
        this.isRestoring = true;
        this.clearDistanceQueue(true);
        this.minReviews = null;
        this.order = 'rating_desc';
        this.selectedRegion = '';
        this.selectedCounty = '';
        this.attractionSearch = '';
        this.page = 1;
        this.gotoPage = null;
        this.countySearch = '';
        this.regionSearch = '';
        this.showAttractionSuggestions = false;
        this.isRestoring = originalRestoring;
        try { localStorage.removeItem('attractionMinReviews'); } catch (e) {}
        try { localStorage.setItem('attractionsOrder', this.order); } catch (e) {}
        try { localStorage.setItem('attractionsRegion', ''); } catch (e) {}
        try { localStorage.setItem('attractionsCounty', ''); } catch (e) {}
        try { localStorage.setItem('attractionsPage', this.page); } catch (e) {}
        if (triggerFetch) {
          this.fetchRegions();
          this.fetchCountis();
          this.fetchAttractions(true);
          this.fetchAllAttractions();
        }
      },
      handleResetFiltersRequest() {
        this.resetFiltersAndPagination(true);
        this.clearResetFiltersRouteFlag();
      },
      async getCustomImageData(id, budget) {
        try {
          const d = await openDB('customAttractionsDB', 1);
          const keys = [`${id}:main`, `${id}:sec0`, `${id}:sec1`];
          const out = {};

          const blobToDataUrl = async (blob) => {
            if (!blob) return '';
            try {
              return await new Promise((resolve) => {
                try {
                  const fr = new FileReader();
                  fr.onload = () => resolve(fr.result || '');
                  fr.onerror = () => resolve('');
                  fr.readAsDataURL(blob);
                } catch (err) { resolve(''); }
              });
            } catch (e) { return ''; }
          };

          const maxSide = 720;
          const quality = 0.8;
          const blobToScaledDataUrl = async (blob) => {
            if (!blob) return '';
            try {
              const url = URL.createObjectURL(blob);
              return await new Promise((resolve) => {
                try {
                  const img = new Image();
                  img.onload = () => {
                    try {
                      let w = img.naturalWidth || img.width || 0;
                      let h = img.naturalHeight || img.height || 0;
                      if (!w || !h) {
                        resolve('');
                        return;
                      }
                      const scale = Math.min(1, maxSide / Math.max(w, h));
                      w = Math.max(1, Math.round(w * scale));
                      h = Math.max(1, Math.round(h * scale));
                      const canvas = document.createElement('canvas');
                      canvas.width = w;
                      canvas.height = h;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) {
                        resolve('');
                        return;
                      }
                      ctx.drawImage(img, 0, 0, w, h);
                      const dataUrl = canvas.toDataURL('image/jpeg', quality) || '';
                      resolve(dataUrl);
                    } catch (err) {
                      resolve('');
                    } finally {
                      try { URL.revokeObjectURL(url); } catch (e) {}
                    }
                  };
                  img.onerror = () => {
                    try { URL.revokeObjectURL(url); } catch (e) {}
                    resolve('');
                  };
                  img.src = url;
                } catch (err) {
                  resolve('');
                }
              });
            } catch (e) { return ''; }
          };

          for (const key of keys) {
            try {
              const blob = await d.get('images', key);
              if (!blob) continue;
              const size = blob && blob.size ? blob.size : 0;
              let dataUrl = '';
              if (!budget || !Number.isFinite(budget.limit)) {
                dataUrl = await blobToDataUrl(blob);
              } else {
                const remaining = Math.max(0, budget.limit - budget.used);
                if (size && size <= remaining) {
                  dataUrl = await blobToDataUrl(blob);
                  budget.used += size;
                } else {
                  // 超出安全阈值时对图片进行压缩
                  dataUrl = await blobToScaledDataUrl(blob);
                  // 压缩后体积更小，这里粗略累加原始 size，避免再次大量原图
                  budget.used += size;
                }
              }
              if (dataUrl) out[key.split(':')[1]] = dataUrl;
            } catch (e) {}
          }
          return out;
        } catch (e) { return {}; }
      },

      // 从浏览器地理编码缓存中移除某个自创景点的经纬度
      removeGeoCacheForCustom(id) {
        try {
          const storeKey = 'geoCache_v1';
          const raw = localStorage.getItem(storeKey);
          if (!raw) return;
          const obj = JSON.parse(raw) || {};
          const cacheKey = `custom|${String(id)}`;
          if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, cacheKey)) {
            delete obj[cacheKey];
            localStorage.setItem(storeKey, JSON.stringify(obj));
          }
        } catch (e) {}
      },

            onTabNameInput(tab, evt) {
        try {
          const el = evt && evt.target;
          const nameRaw = el ? (el.textContent || '') : '';
          this.editingTabName = nameRaw;
          if (tab && tab.id) {
            tab.name = nameRaw;
          }
          if (this.renameSaveTimer) { clearTimeout(this.renameSaveTimer); this.renameSaveTimer = null; }
          this.renameSaveTimer = setTimeout(() => { try { this.saveFavorites(); } catch(e) {} }, 300);
        } catch (e) {}
      },
      onCustomCreated(attraction) {
        if (!attraction || !attraction.id) return;
        const nextOrder = (this.favorites?.length || 0) + 1;
        this.favorites.push({
          id: String(attraction.id),
          name: attraction.name || '未命名景点',
          region: attraction.region || '',
          rating: Number.isFinite(attraction.rating) ? attraction.rating : 0,
          county: attraction.county || '',
          country: 'custom',
          order: nextOrder,
        });
        this.normalizeFavoritesOrder();
        this.saveFavorites();
        // 预加载缩略图
        try { this.ensureFavThumb({ id: attraction.id, country: 'custom' }); } catch (e) {}
      },
      openMapMode() {
        try {
          this.$router.push({ path: `/map/${this.country}` });
        } catch(e) {}
      },
      // 改为删除整个收藏列表（与拖动选项卡到菜单外删除的行为一致）
      // 当收藏为空时：不弹确认框，直接删除当前收藏
      promptClearFavorites() {
        try {
          const id = this.activeTabId;
          if (!id) return;
          if (!this.sortedFavorites.length) {
            this.tabDeleteTargetId = id;
            this.performDeleteTab();
            return;
          }
          this.confirmDeleteTab(id);
        } catch (e) {}
      },
      // 导入/导出收藏列表
      onImportClick() {
        try {
          const input = this.$refs.importFileInput;
          if (!input) return;
          // Prefer showPicker when available (Chrome/Android)
          if (typeof input.showPicker === 'function') {
            try { input.showPicker(); return; } catch (e) {}
          }
          // Fallback to click; ensure element is in DOM and not display:none on strict browsers
          if (input && input.click) input.click();
        } catch (e) {}
      },
      async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      },
      isNativeAndroid() {
        try {
          if (!Capacitor || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) {
            return false;
          }
          const platform = Capacitor.getPlatform && Capacitor.getPlatform();
          return platform === 'android';
        } catch (e) {
          return false;
        }
      },
      shouldIncludeImagesForExport() {
        // 默认允许导出图片，具体是否压缩由 getCustomImageData 的预算控制
        return true;
      },
      getExportImageLimit() {
        try {
          // 原生 Android 上保守一些，控制在约 4MB 原始图片数据以内
          if (this.isNativeAndroid && this.isNativeAndroid()) {
            return 4 * 1024 * 1024;
          }
        } catch (e) {}
        // 浏览器环境宽松一些，基本不触发压缩
        return Number.POSITIVE_INFINITY;
      },
      async saveExportWithFilesystem(jsonText, fileName) {
        try {
          if (!Capacitor || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) {
            return false;
          }
          const platform = Capacitor.getPlatform && Capacitor.getPlatform();
          if (platform !== 'android') return false;
          const safeName = (fileName || 'favorites.json').replace(/[\\/]+/g, '_');
          const dir = Directory.Documents;
          try {
            await Filesystem.mkdir({ path: 'favorites_exports', directory: dir, recursive: true });
          } catch (e) {}

          // 如果已存在同名文件，则自动添加后缀避免覆盖
          let finalName = safeName;
          try {
            const listing = await Filesystem.readdir({ path: 'favorites_exports', directory: dir });
            const files = Array.isArray(listing?.files) ? listing.files : (listing || []);
            const names = files.map((f) => {
              if (!f) return '';
              if (typeof f === 'string') return f;
              return f.name || f.uri || '';
            }).filter(Boolean);

            if (names.includes(finalName)) {
              const dot = safeName.lastIndexOf('.');
              const base = dot > 0 ? safeName.slice(0, dot) : safeName;
              const ext = dot > 0 ? safeName.slice(dot) : '';
              let index = 1;
              while (index < 1000) {
                const candidate = `${base}(${index})${ext}`;
                if (!names.includes(candidate)) {
                  finalName = candidate;
                  break;
                }
                index += 1;
              }
            }
          } catch (e) {}

          const path = `favorites_exports/${finalName}`;
          await Filesystem.writeFile({
            path,
            data: jsonText,
            directory: dir,
            encoding: Encoding.UTF8,
          });
          try { alert(`已保存到本机文档目录：${path}`); } catch (e) {}
          return true;
        } catch (e) {
          return false;
        }
      },
      async buildExportItems(rawItems, includeImages, imageBudget) {
        const items = Array.isArray(rawItems) ? [...rawItems] : [];
        const result = [];
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const pending = !!it.pending;
          if (String(it.country) === 'custom') {
            const full = findCustomAttractionById(it.id) || null;
            const base = { kind: 'custom', pending, data: full };
            if (includeImages) {
              try {
                const images = await this.getCustomImageData(it.id, imageBudget);
                if (images && Object.keys(images).length) {
                  base.images = images;
                  this.exportHasImages = true;
                }
              } catch (e) {}
            }
            result.push(base);
          } else {
            result.push({
              kind: 'ref',
              pending,
              data: {
                id: it.id,
                name: it.name,
                region: it.region,
                county: it.county,
                country: it.country,
                rating: it.rating,
              },
            });
          }
          this.exportProgress += 1;
          if (i % 3 === 2) {
            await this.sleep(0);
          }
        }
        return result;
      },
      async buildExportTabs(tabs, includeImages, imageBudget) {
        const list = Array.isArray(tabs) ? tabs : [];
        const outTabs = [];
        let total = 0;
        list.forEach(t => {
          if (Array.isArray(t.items)) total += t.items.length;
        });
        this.exportTotal = total;
        this.exportProgress = 0;
        for (const t of list) {
          const packedItems = await this.buildExportItems(t.items || [], includeImages, imageBudget);
          outTabs.push({
            tabName: t.name || '新建收藏',
            items: packedItems,
          });
        }
        return outTabs;
      },
      async exportActiveFavorites(fromChoice) {
        if (this.exporting) return;
        this.exporting = true;
        this.exportProgress = 0;
        this.exportTotal = 0;
        this.exportHasImages = false;
        await this.$nextTick();
        await this.sleep(0);
        let didExport = false;
        try {
          // When only one (or zero) favorite tab exists, bypass choice dialog
          // Otherwise, require explicit choice if not already chosen
          if (!fromChoice) {
            const tabsCount = Array.isArray(this.favoriteTabs) ? this.favoriteTabs.length : 0;
            if (tabsCount > 1) { this.showExportChoice = true; return; }
          }
          didExport = true;
          const active = this.favoriteTabs.find(t => t.id === this.activeTabId);
          const items = Array.isArray(this.favorites) ? [...this.favorites] : [];
          this.exportTotal = items.length;
          this.exportProgress = 0;
          const imageBudget = { used: 0, limit: this.getExportImageLimit() };
          let packedItems;
          let payload;
          const allowImages = this.shouldIncludeImagesForExport();
          try {
            packedItems = await this.buildExportItems(items, allowImages, imageBudget);
            payload = {
              version: 1,
              type: 'favorites-export',
              tabName: active ? (active.name || '新的收藏') : '新的收藏',
              exportedAt: new Date().toISOString(),
              items: packedItems,
            };
          } catch (eBuild) {
            if (allowImages) {
              try { alert('导出包含图片的自创景点失败，已改为不导出图片。'); } catch (_) {}
              this.exportProgress = 0;
              packedItems = await this.buildExportItems(items, false);
              payload = {
                version: 1,
                type: 'favorites-export',
                tabName: active ? (active.name || '新的收藏') : '新的收藏',
                exportedAt: new Date().toISOString(),
                items: packedItems,
              };
            } else {
              throw eBuild;
            }
          }
          const jsonText = JSON.stringify(payload, null, 2);
          const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
          const fileName = (payload.tabName || '收藏')
            .replace(/\s+/g, '_')
            .replace(/[^\w\u4e00-\u9fa5\-_]/g, '') + '_favorites.json';

          // 原生安卓应用优先使用 Capacitor Filesystem 直接写入文件，增加超时保护
          let fsOk = false;
          if (this.isNativeAndroid && this.isNativeAndroid()) {
            try {
              const fsResult = await Promise.race([
                this.saveExportWithFilesystem(jsonText, fileName),
                this.sleep(15000).then(() => 'timeout'),
              ]);
              fsOk = fsResult === true;
              if (fsResult === 'timeout') {
                try { alert('导出文件较大，直接保存耗时较长，已改用其他导出方式。'); } catch (_) {}
              }
            } catch (eFs) {
              fsOk = false;
            }
          }
          if (fsOk) return;

          const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
          const isAndroidWebView = /Android/i.test(ua) && /\bwv\b/i.test(ua);

          // 优先使用 Web Share（移动端更友好）
          try {
            if (typeof File !== 'undefined' && navigator && typeof navigator.canShare === 'function') {
              const file = new File([blob], fileName, { type: 'application/json' });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: fileName });
                return;
              }
            }
          } catch (eShare) {}

          // 次优先：仅分享文本，兼容不支持文件分享的 Android WebView 等环境
          try {
            if (navigator && typeof navigator.share === 'function') {
              await navigator.share({ title: fileName, text: jsonText });
              return;
            }
          } catch (eShareText) {}

          // Android WebView 中 download/window.open 对 Blob 常常无效，直接走剪贴板/弹窗回退
          if (!isAndroidWebView) {
            // 其次尝试 a[download]
            try {
              const a = document.createElement('a');
              if ('download' in a) {
                const url = URL.createObjectURL(blob);
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  try { document.body.removeChild(a); } catch(e) {}
                  try { URL.revokeObjectURL(url); } catch(e) {}
                }, 0);
                return;
              }
            } catch (eDL) {}
            // 再次回退：打开新标签页预览（iOS Safari 不支持 download）
            try {
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank', 'noopener');
              // 给出提示：在新页面通过分享/保存
              try { alert('已在新页面打开导出的数据，可通过分享或“保存到文件”进行保存。'); } catch(e) {}
              // 稍后释放 URL
              setTimeout(() => { try { URL.revokeObjectURL(url); } catch(e) {} }, 4000);
              return;
            } catch (eOpen) {}
          }

          // 最后回退：复制到剪贴板或简短提示
          if (!this.isNativeAndroid || !this.isNativeAndroid()) {
            try {
              if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(jsonText);
                alert('已复制导出数据到剪贴板，请粘贴保存。');
                return;
              }
            } catch (eClip) {}
            // 若以上方案均受限，显示回退弹窗以便复制/手动保存（仅非原生环境）
            this.openExportFallback(jsonText, fileName);
          } else {
            // 原生 Android 上避免在页面中渲染超大 JSON，防止卡死和闪退
            try {
              alert('导出文件已生成，但当前手机环境无法直接展示或复制全部内容。如需备份，请在电脑浏览器打开本网站导出。');
            } catch (_) {}
          }
        } catch (e) {
          try { console.error && console.error('exportActiveFavorites error', e); } catch (_) {}
          try { alert('导出收藏失败，请稍后重试，或删除部分包含大图片的自创景点后再尝试。'); } catch (_) {}
        } finally {
          this.exporting = false;
          this.exportProgress = 0;
          this.exportTotal = 0;
          if (didExport) {
            try { invalidateAttractionMapCache('favorites:export'); } catch (e) {}
          }
        }
      },
      openExportFallback(jsonText, fileName) {
        try {
          this.exportJsonText = jsonText || '';
          this.exportFileName = fileName || 'favorites.json';
          this.exportDataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(this.exportJsonText);
          this.showExportModal = true;
        } catch (e) {
          this.showExportModal = true;
        }
      },
      // Export all favorite tabs into a single file
      async exportAllFavorites() {
        if (this.exporting) return;
        this.exporting = true;
        this.exportProgress = 0;
        this.exportTotal = 0;
        this.exportHasImages = false;
        await this.$nextTick();
        await this.sleep(0);
        let didExport = false;
        try {
          didExport = true;
          const tabs = Array.isArray(this.favoriteTabs) ? this.favoriteTabs : [];
          const imageBudget = { used: 0, limit: this.getExportImageLimit() };
          let outTabs;
          let payload;
          const allowImages = this.shouldIncludeImagesForExport();
          try {
            outTabs = await this.buildExportTabs(tabs, allowImages, imageBudget);
            payload = {
              version: 1,
              type: 'favorites-export-multi',
              exportedAt: new Date().toISOString(),
              tabs: outTabs,
            };
          } catch (eBuild) {
            if (allowImages) {
              try { alert('导出包含图片的自创景点失败，已改为不导出图片。'); } catch (_) {}
              outTabs = await this.buildExportTabs(tabs, false);
              payload = {
                version: 1,
                type: 'favorites-export-multi',
                exportedAt: new Date().toISOString(),
                tabs: outTabs,
              };
            } else {
              throw eBuild;
            }
          }
          const jsonText = JSON.stringify(payload, null, 2);
          const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
          const fileName = 'all_favorites.json';

          let fsOk = false;
          if (this.isNativeAndroid && this.isNativeAndroid()) {
            try {
              const fsResult = await Promise.race([
                this.saveExportWithFilesystem(jsonText, fileName),
                this.sleep(15000).then(() => 'timeout'),
              ]);
              fsOk = fsResult === true;
              if (fsResult === 'timeout') {
                try { alert('导出文件较大，直接保存耗时较长，已改用其他导出方式。'); } catch (_) {}
              }
            } catch (eFs) {
              fsOk = false;
            }
          }
          if (fsOk) return;

          const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
          const isAndroidWebView = /Android/i.test(ua) && /\bwv\b/i.test(ua);

          // 优先使用 Web Share（移动端更友好）
          try {
            if (typeof File !== 'undefined' && navigator && typeof navigator.canShare === 'function') {
              const file = new File([blob], fileName, { type: 'application/json' });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: fileName });
                return;
              }
            }
          } catch (eShare) {}

          // 次优先：仅分享文本，兼容不支持文件分享的 Android WebView 等环境
          try {
            if (navigator && typeof navigator.share === 'function') {
              await navigator.share({ title: fileName, text: jsonText });
              return;
            }
          } catch (eShareText) {}

          if (!isAndroidWebView) {
            try {
              const a = document.createElement('a');
              if ('download' in a) {
                const url = URL.createObjectURL(blob);
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  try { document.body.removeChild(a); } catch(e) {}
                  try { URL.revokeObjectURL(url); } catch(e) {}
                }, 0);
                return;
              }
            } catch (eDL) {}
            try {
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank', 'noopener');
              try { alert('已在新页面打开导出内容，可通过浏览器保存。'); } catch(e) {}
              setTimeout(() => { try { URL.revokeObjectURL(url); } catch(e) {} }, 4000);
              return;
            } catch (eOpen) {}
          }
          if (!this.isNativeAndroid || !this.isNativeAndroid()) {
            try {
              if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(jsonText);
                alert('已复制导出内容到剪贴板');
                return;
              }
            } catch (eClip) {}
            this.openExportFallback(jsonText, fileName);
          } else {
            try {
              alert('导出文件已生成，但当前手机环境无法直接展示或复制全部内容。如需备份，请在电脑浏览器打开本网站导出。');
            } catch (_) {}
          }
        } catch (e) {
          try { console.error && console.error('exportAllFavorites error', e); } catch (_) {}
          try { alert('导出全部收藏失败，请稍后重试，或删除部分包含大图片的自创景点后再尝试。'); } catch (_) {}
        } finally {
          this.exporting = false;
          this.exportProgress = 0;
          this.exportTotal = 0;
          if (didExport) {
            try { invalidateAttractionMapCache('favorites:exportAll'); } catch (e) {}
          }
        }
      },
      closeExportFallback() { this.showExportModal = false; },
      async copyExportJson() {
        const text = this.exportJsonText || '';
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            alert('已复制到剪贴板');
            return;
          }
        } catch (e) {}
        try {
          // 旧兼容：选中文本复制
          const area = this.$refs.exportArea;
          if (area && area.select) {
            area.select();
            document.execCommand && document.execCommand('copy');
            alert('已复制到剪贴板');
          }
        } catch (e2) {}
      },
      openExportDataUrl() {
        try { window.open(this.exportDataUrl, '_blank', 'noopener'); } catch (e) {}
      },
      // Open export, but skip dialog when only a single list exists
      promptExportFavorites() {
        try {
          const tabsCount = Array.isArray(this.favoriteTabs) ? this.favoriteTabs.length : 0;
          if (tabsCount <= 1) { this.exportActiveFavorites(true); return; }
          this.showExportChoice = true;
        } catch (e) {
          this.showExportChoice = true;
        }
      },
      // Export choice dialog handlers
      exportChoiceCurrent() { try { this.showExportChoice = false; this.exportActiveFavorites(true); } catch (e) {} },
      exportChoiceAll() { try { this.showExportChoice = false; this.exportAllFavorites(); } catch (e) {} },
      closeExportChoice() { this.showExportChoice = false; },
      async handleImportFile(evt) {
        try {
          const file = evt && evt.target && evt.target.files && evt.target.files[0];
          if (!file) return;
          // Some older mobile browsers lack file.text(); fallback to FileReader
          let text = '';
          try {
            if (typeof file.text === 'function') {
              text = await file.text();
            } else {
              text = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = (e) => reject(e);
                try { reader.readAsText(file); } catch (e) { reject(e); }
              });
            }
          } catch (e) {
            // 文件读取失败时，弹出粘贴 JSON 的对话框
            try { evt && evt.target && (evt.target.value = ''); } catch(_) {}
            this.importPasteText = '';
            this.showImportPaste = true;
            return;
            try { alert('无法读取所选文件，请确认为 JSON 格式后重试。'); } catch(_) {}
            try { evt.target.value = ''; } catch(_) {}
            return;
          }
          const data = JSON.parse(text);
          // Multi-tabs import: append all tabs to the end
          if (data && data.type === 'favorites-export-multi' && Array.isArray(data.tabs)) {
            let baseOrder = this.favoriteTabs.reduce((m, t) => Math.max(m, t.order || 0), 0) + 1;
            const importOne = async (tab) => {
              const newTab = { id: this.uid(), name: tab.tabName || '导入收藏', items: [], order: baseOrder++ };
              const items = [];
              const arr = Array.isArray(tab.items) ? tab.items : [];
              for (const entry of arr) {
                if (!entry || !entry.kind) continue;
                if (entry.kind === 'custom' && entry.data) {
                  let custom = entry.data;
                  if (!custom.id) custom.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                  const existed = findCustomAttractionById(custom.id);
                  if (existed && JSON.stringify(existed) !== JSON.stringify(custom)) {
                    custom = { ...custom, id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5) };
                  }
                  try {
                    const allRaw = localStorage.getItem('customAttractions');
                    const all = allRaw ? (JSON.parse(allRaw) || []) : [];
                    const idx = all.findIndex(a => String(a.id) === String(custom.id));
                    if (idx >= 0) all[idx] = custom; else all.push(custom);
                    saveAllCustomAttractions(all);
                  } catch (e) {}
                  try {
                    if (entry.images && typeof entry.images === 'object') {
                      if (entry.images.main) await setCustomImage(`${custom.id}:main`, entry.images.main);
                      if (entry.images.sec0) await setCustomImage(`${custom.id}:sec0`, entry.images.sec0);
                      if (entry.images.sec1) await setCustomImage(`${custom.id}:sec1`, entry.images.sec1);
                    }
                  } catch (e) {}
                  items.push({ id: custom.id, name: custom.name, region: custom.region, county: custom.county, country: 'custom', pending: !!entry.pending });
                } else if (entry.kind === 'ref' && entry.data) {
                  const it = entry.data;
                  items.push({ id: it.id, name: it.name, region: it.region, county: it.county, country: it.country, rating: it.rating, pending: !!entry.pending });
                }
              }
              items.forEach((it, idx) => (it.order = idx + 1));
              newTab.items = items;
              this.favoriteTabs.push(newTab);
            };
            for (const t of data.tabs) { await importOne(t); }
            this.normalizeTabsOrder();
            this.saveFavorites();
            try { this.setActiveTab(this.favoriteTabs[this.favoriteTabs.length - 1].id); } catch (e) {}
            try { evt.target.value = ''; } catch (e) {}
            this.$nextTick(() => { try { this.sortedFavorites.forEach(f => this.ensureFavThumb(f)); } catch(e) {} });
            return;
          }
          if (!data || data.type !== 'favorites-export' || !Array.isArray(data.items)) return;
          const newTab = { id: this.uid(), name: data.tabName || '导入的收藏', items: [], order: (this.favoriteTabs.reduce((m, t) => Math.max(m, t.order || 0), 0) + 1) };
          // 先处理自创景点，避免ID冲突
          const items = [];
          for (const entry of data.items) {
            if (!entry || !entry.kind) continue;
            if (entry.kind === 'custom' && entry.data) {
              let custom = entry.data;
              // 确保有ID
              if (!custom.id) custom.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
              // 若ID已存在且不同内容，则生成新ID
              const existed = findCustomAttractionById(custom.id);
              if (existed && JSON.stringify(existed) !== JSON.stringify(custom)) {
                custom = { ...custom, id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5) };
              }
                  // 写入/更新本地自创库
              try {
                const allRaw = localStorage.getItem('customAttractions');
                const all = allRaw ? (JSON.parse(allRaw) || []) : [];
                const idx = all.findIndex(a => String(a.id) === String(custom.id));
                // 标记为来自导入
                const customWithImport = { ...custom, isImported: true };
                if (idx >= 0) all[idx] = customWithImport; else all.push(customWithImport);
                saveAllCustomAttractions(all);
              } catch (e) {}
                            // 还原图片（如导出包含）
              try {
                if (entry.images && typeof entry.images === 'object') {
                  if (entry.images.main) await setCustomImage(`${custom.id}:main`, entry.images.main);
                  if (entry.images.sec0) await setCustomImage(`${custom.id}:sec0`, entry.images.sec0);
                  if (entry.images.sec1) await setCustomImage(`${custom.id}:sec1`, entry.images.sec1);
                }
              } catch (e) {}
              // 推入收藏项（自创）
              items.push({
                id: custom.id,
                name: custom.name,
                region: custom.region,
                county: custom.county,
                country: 'custom',
                pending: !!entry.pending
              });
            } else if (entry.kind === 'ref' && entry.data) {
              const it = entry.data;
              items.push({
                id: it.id,
                name: it.name,
                region: it.region,
                county: it.county,
                country: it.country,
                rating: it.rating,
                pending: !!entry.pending
              });
            }
          }
          // 设置顺序
          items.forEach((it, idx) => (it.order = idx + 1));
          newTab.items = items;
          this.favoriteTabs.push(newTab);
          this.normalizeTabsOrder();
          this.saveFavorites();
          // 激活新标签
          this.setActiveTab(newTab.id);
          // 清空文件输入
          try { evt.target.value = ''; } catch (e) {}
          // 预加载缩略图
          this.$nextTick(() => {
            try { this.sortedFavorites.forEach(f => this.ensureFavThumb(f)); } catch(e) {}
          });
        } catch (e) {
          try { evt && evt.target && (evt.target.value = ''); } catch (e2) {}
        }
      },

      async doImportFromParsedData(data, evtTarget) {
        // Multi-tabs import: append all tabs to the end
        if (data && data.type === 'favorites-export-multi' && Array.isArray(data.tabs)) {
          let baseOrder = this.favoriteTabs.reduce((m, t) => Math.max(m, t.order || 0), 0) + 1;
          const importOne = async (tab) => {
            const newTab = { id: this.uid(), name: tab.tabName || '新的收藏', items: [], order: baseOrder++ };
            const items = [];
            const arr = Array.isArray(tab.items) ? tab.items : [];
            for (const entry of arr) {
              if (!entry || !entry.kind) continue;
              if (entry.kind === 'custom' && entry.data) {
                let custom = entry.data;
                if (!custom.id) custom.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                const existed = findCustomAttractionById(custom.id);
                if (existed && JSON.stringify(existed) !== JSON.stringify(custom)) {
                  custom = { ...custom, id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5) };
                }
                try {
                  const allRaw = localStorage.getItem('customAttractions');
                  const all = allRaw ? (JSON.parse(allRaw) || []) : [];
                  const idx = all.findIndex(a => String(a.id) === String(custom.id));
                  // 标记为来自导入
                  const customWithImport = { ...custom, isImported: true };
                  if (idx >= 0) all[idx] = customWithImport; else all.push(customWithImport);
                  saveAllCustomAttractions(all);
                } catch (e) {}
                try {
                  if (entry.images && typeof entry.images === 'object') {
                    if (entry.images.main) await setCustomImage(`${custom.id}:main`, entry.images.main);
                    if (entry.images.sec0) await setCustomImage(`${custom.id}:sec0`, entry.images.sec0);
                    if (entry.images.sec1) await setCustomImage(`${custom.id}:sec1`, entry.images.sec1);
                  }
                } catch (e) {}
                items.push({ id: custom.id, name: custom.name, region: custom.region, county: custom.county, country: 'custom', pending: !!entry.pending });
              } else if (entry.kind === 'ref' && entry.data) {
                const it = entry.data;
                items.push({ id: it.id, name: it.name, region: it.region, county: it.county, country: it.country, rating: it.rating, pending: !!entry.pending });
              }
            }
            items.forEach((it, idx) => (it.order = idx + 1));
            newTab.items = items;
            this.favoriteTabs.push(newTab);
          };
          for (const t of data.tabs) { await importOne(t); }
          this.normalizeTabsOrder();
          this.saveFavorites();
          try { this.setActiveTab(this.favoriteTabs[this.favoriteTabs.length - 1].id); } catch (e) {}
          try { evtTarget && (evtTarget.value = ''); } catch (e) {}
          this.$nextTick(() => { try { this.sortedFavorites.forEach(f => this.ensureFavThumb(f)); } catch(e) {} });
          return;
        }
        if (!data || data.type !== 'favorites-export' || !Array.isArray(data.items)) return;
        const newTab = { id: this.uid(), name: data.tabName || '导入的收藏', items: [], order: (this.favoriteTabs.reduce((m, t) => Math.max(m, t.order || 0), 0) + 1) };
        const items = [];
        for (const entry of data.items) {
          if (!entry || !entry.kind) continue;
          if (entry.kind === 'custom' && entry.data) {
            let custom = entry.data;
            if (!custom.id) custom.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
            const existed = findCustomAttractionById(custom.id);
            if (existed && JSON.stringify(existed) !== JSON.stringify(custom)) {
              custom = { ...custom, id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5) };
            }
            try {
              const allRaw = localStorage.getItem('customAttractions');
              const all = allRaw ? (JSON.parse(allRaw) || []) : [];
              const idx = all.findIndex(a => String(a.id) === String(custom.id));
              // 标记为来自导入
              const customWithImport = { ...custom, isImported: true };
              if (idx >= 0) all[idx] = customWithImport; else all.push(customWithImport);
              saveAllCustomAttractions(all);
            } catch (e) {}
            try {
              if (entry.images && typeof entry.images === 'object') {
                if (entry.images.main) await setCustomImage(`${custom.id}:main`, entry.images.main);
                if (entry.images.sec0) await setCustomImage(`${custom.id}:sec0`, entry.images.sec0);
                if (entry.images.sec1) await setCustomImage(`${custom.id}:sec1`, entry.images.sec1);
              }
            } catch (e) {}
            items.push({
              id: custom.id,
              name: custom.name,
              region: custom.region,
              county: custom.county,
              country: 'custom',
              pending: !!entry.pending
            });
          } else if (entry.kind === 'ref' && entry.data) {
            const it = entry.data;
            items.push({
              id: it.id,
              name: it.name,
              region: it.region,
              county: it.county,
              country: it.country,
              rating: it.rating,
              pending: !!entry.pending
            });
          }
        }
        items.forEach((it, idx) => (it.order = idx + 1));
        newTab.items = items;
        this.favoriteTabs.push(newTab);
        this.normalizeTabsOrder();
        this.saveFavorites();
        this.setActiveTab(newTab.id);
        try { evtTarget && (evtTarget.value = ''); } catch (e) {}
        this.$nextTick(() => {
          try { this.sortedFavorites.forEach(f => this.ensureFavThumb(f)); } catch(e) {}
        });
      },

      cancelImportPaste() {
        this.showImportPaste = false;
        this.importPasteText = '';
      },
      async confirmImportPaste() {
        try {
          const text = String(this.importPasteText || '').trim();
          if (!text) { this.showImportPaste = false; return; }
          const data = JSON.parse(text);
          await this.doImportFromParsedData(data, null);
          this.showImportPaste = false;
          this.importPasteText = '';
        } catch (e) {
          try { alert('粘贴的内容不是有效的 JSON。'); } catch(_) {}
        }
      },

      // ========= 收藏 Tabs 相关 =========

      scrollActiveTabIntoCenter() {
        this.$nextTick(() => {
          const tabs = this.$refs.favTabs;
          const wrap = this.$refs.favTabsWrap;
          if (!tabs || !wrap) return;

          const activeTab = tabs.querySelector('.fav-tab.active');
          if (!activeTab) return;

          const wrapRect = wrap.getBoundingClientRect();
          const tabRect = activeTab.getBoundingClientRect();

          // 计算目标 scrollLeft，使激活tab居中
          const activeCenter = tabRect.left - wrapRect.left + tabRect.width / 2;
          const targetScrollLeft = tabs.scrollLeft + (activeCenter - wrapRect.width / 2);

          // 去掉动画（立即跳过去）
          tabs.scrollLeft = targetScrollLeft;
        });
      },

      
      loadFavorites() {
        try {
          const tabsKey = this.getFavoritesStorageKey();
          const rawTabs = localStorage.getItem(tabsKey);
          if (rawTabs) {
            const parsed = JSON.parse(rawTabs) || [];
            this.favoriteTabs = Array.isArray(parsed) ? parsed : [];
          } else {
            // migrate from old single list
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
          // Normalize tabs
          this.normalizeTabsOrder();
          if (!this.favoriteTabs.length) {
            this.favoriteTabs = [{ id: this.uid(), name: '新的收藏', items: [], order: 1 }];
          }
          // Set active tab
          // 从localStorage恢复上次激活的tab
          let savedActive = null;
          try { savedActive = localStorage.getItem('favoriteTabs_activeId'); } catch(e) {}

          if (savedActive && this.favoriteTabs.find(t => t.id === savedActive)) {
            this.activeTabId = savedActive;
          } else if (!this.activeTabId || !this.favoriteTabs.find(t => t.id === this.activeTabId)) {
            this.activeTabId = this.favoriteTabs[0].id;
          }

          // Bind favorites reference to active tab items
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
        // Persist entire tabs structure
        const key = this.getFavoritesStorageKey();
        try {
          // 保护：如果 favoriteTabs 为空或未定义，且 localStorage 中已有数据，则不保存，避免清空已有收藏列表
          if ((!this.favoriteTabs || this.favoriteTabs.length === 0) && localStorage.getItem(key)) {
            return;
          }
          const next = JSON.stringify(this.favoriteTabs || []);
          let prev = null;
          try { prev = localStorage.getItem(key); } catch (e) { prev = null; }
          if (prev === next) return;
          localStorage.setItem(key, next);
          try { invalidateAttractionMapCache('favorites:save'); } catch (e) {}
        } catch(e) {}
        try { queueUserDataSync(); } catch (e) {}
      },
      getFavoritesStorageKey() {
        // 跨国家共用收藏（多选项卡）
        return `favoriteTabs_all`;
      },
      normalizeTabsOrder() {
        this.favoriteTabs
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .forEach((t, idx) => (t.order = idx + 1));
      },
      normalizeFavoritesOrder() {
        this.favorites
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .forEach((item, idx) => (item.order = idx + 1));
      },
      normalizeTabItemsOrder(tab) {
        if (!tab || !Array.isArray(tab.items)) return;
        tab.items
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .forEach((item, idx) => { item.order = idx + 1; });
      },
      isFavorited(id) {
        return this.favorites.some(f => f.id === id && f.country === this.country);
      },
      isPendingFavorite(id) {
        return this.favorites.some(f => f.id === id && f.country === this.country && !!f.pending);
      },
      toggleFavorite(attraction) {
        const idx = this.favorites.findIndex(f => f.id === attraction.id && f.country === this.country);
        if (idx >= 0) {
          this.favorites.splice(idx, 1);
          this.normalizeFavoritesOrder();
        } else {
          const nextOrder = this.favorites.length + 1;
          this.favorites.push({
            id: attraction.id,
            name: attraction.name,
            region: attraction.region,
            rating: attraction.rating,
            county: attraction.county,
            country: this.country,
            order: nextOrder,
          });
        }
        // ensure active tab keeps array reference (safety)
        const at = this.favoriteTabs.find(t => t.id === this.activeTabId);
        if (at && at.items !== this.favorites) {
          at.items = this.favorites;
        }
        this.saveFavorites();
      },
      // ===== Tabs actions =====
      uid() {
        return 't' + Math.random().toString(36).slice(2, 9);
      },
      onTabClick(tab, index, evt) {
        if (this.tabDragging) return;
        if (this.editingTabId && this.editingTabId === tab.id) return;
        if (tab.id === this.activeTabId) {
          // rename on active tab click
          this.startEditTab(tab);
        } else {
          this.setActiveTab(tab.id);
        }
      },
      setActiveTab(id) {
        this.activeTabId = id;
        // 记忆选中的tab
        try { localStorage.setItem('favoriteTabs_activeId', id); } catch(e) {}
        try { queueUserDataSync(); } catch (e) {}
        try { invalidateAttractionMapCache('favorites:switchTab'); } catch (e) {}

        const at = this.favoriteTabs.find(t => t.id === id);
        this.favorites = at ? at.items : [];
        this.normalizeFavoritesOrder();
        // 滚动到激活tab居中
        this.scrollActiveTabIntoCenter();
        // 预加载缩略图
        this.$nextTick(() => {
          try { this.sortedFavorites.forEach(f => this.ensureFavThumb(f)); } catch(e) {}
        });
      },

      startEditTab(tab) {
        this.editingTabId = tab.id;
        this.editingTabName = tab.name || '';
        this.$nextTick(() => {
          const refName = 'tabEdit_' + tab.id;
          const el = this.$refs[refName] && (Array.isArray(this.$refs[refName]) ? this.$refs[refName][0] : this.$refs[refName]);
          if (el) {
            try {
              // Put current name into contenteditable and move caret to end
              el.textContent = this.editingTabName;
              el.focus();
              const range = document.createRange();
              range.selectNodeContents(el);
              range.collapse(false); // caret at end
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
            } catch (e) {}
          }
          this.attachEditOutsideListeners(tab.id);
        });
      },
      onTabCompositionEnd(tab, evt) {
        this.tabEditingComposing = false;
        try {
          const el = evt && evt.target;
          const nameRaw = el ? (el.textContent || '') : '';
          this.editingTabName = nameRaw;
          if (tab && tab.id) {
            tab.name = nameRaw;
          }
        } catch (e) {}
      },
      onTabEditEnter(evt) {
        if (this.tabEditingComposing) return;
        this.finishEditTab(true);
      },
      onTabEditEsc(evt) {
        if (this.tabEditingComposing) return;
        this.finishEditTab(false);
      },
      finishEditTab(commit) {
        const id = this.editingTabId;
        if (!id) return;
        const tab = this.favoriteTabs.find(t => t.id === id);
        if (tab && commit) {
          // Read from DOM to ensure latest text
          const refName = 'tabEdit_' + id;
          const el = this.$refs[refName] && (Array.isArray(this.$refs[refName]) ? this.$refs[refName][0] : this.$refs[refName]);
          const nameRaw = el ? (el.textContent || '') : this.editingTabName;
          const name = (nameRaw || '').trim();
          tab.name = name || '新的收藏';
          this.saveFavorites();
        }
        this.editingTabId = null;
        this.editingTabName = '';
        this.detachEditOutsideListeners();
      },
      addNewTab() {
        const maxOrder = this.favoriteTabs.reduce((m, t) => Math.max(m, t.order || 0), 0);
        const tab = { id: this.uid(), name: '新的收藏', items: [], order: maxOrder + 1 };
        this.favoriteTabs.push(tab);
        this.normalizeTabsOrder();
        this.saveFavorites();
        this.setActiveTab(tab.id);
        this.scrollActiveTabIntoCenter();
        // 可选：进入重命名
        // this.startEditTab(tab);
      },
      // Long-press to drag tabs
      onTabPressStart(index, evt) {
        if (!this.showFavorites) return; // within menu
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
            // cancel long press if moved
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
        // capture widths to prevent jitter
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
        // measure ghost width a bit larger than original, without wrapping
        try {
          const measured = dragEl ? Math.ceil(dragEl.scrollWidth || rect.width || 0) : (rect ? rect.width : 0);
          // add some breathing room
          const extra = 16;
          const max = Math.min(window.innerWidth || 600, 480);
          this.tabGhostWidth = Math.max(40, Math.min(measured + extra, max));
        } catch (e) {
          this.tabGhostWidth = rect ? rect.width : 80;
        }
        // attach move/up
        this.attachTabDragListeners();
        // restore scrollLeft after DOM updates to prevent jumping to the left
        this.$nextTick(() => {
          try { if (this.$refs.favTabs) this.$refs.favTabs.scrollLeft = this.tabStartScrollLeft; } catch(e) {}
          // evaluate edge auto-scroll immediately based on start point
          this.maybeTabAutoScroll({ clientX: startX, clientY: startY });
        });
      },
      attachTabDragListeners() {
        this.tabMoveListener = (e) => this.onTabDragMove(e);
        this.tabUpListener = (e) => this.finishTabDrag(e);
        window.addEventListener('mousemove', this.tabMoveListener, true);
        window.addEventListener('mouseup', this.tabUpListener, true);
        // Use capture:true and passive:false so we can reliably prevent native scrolling during tab drag
        window.addEventListener('touchmove', this.tabMoveListener, { passive: false, capture: true });
        window.addEventListener('touchend', this.tabUpListener, true);
      },
      detachTabDragListeners() {
        try {
          window.removeEventListener('mousemove', this.tabMoveListener, true);
          window.removeEventListener('mouseup', this.tabUpListener, true);
          // Must match the addEventListener options to actually remove the listener
          window.removeEventListener('touchmove', this.tabMoveListener, { capture: true });
          window.removeEventListener('touchend', this.tabUpListener, true);
        } catch(e) {}
        this.tabMoveListener = null;
        this.tabUpListener = null;
      },
      onTabDragMove(evt) {
        // Ignore stray events if not in tab-drag state
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
        // update placeholder index by comparing midpoints
        const tabs = this.$refs.favTabs;
        const tabEls = tabs ? Array.from(tabs.querySelectorAll('.fav-tab')) : [];
        const rects = tabEls.map(el => el.getBoundingClientRect());
        const centers = rects.map(r => (r.left + r.right) / 2);
        let target = centers.length; // default to end
        for (let i = 0; i < centers.length; i++) {
          if (this.tabDragX < centers[i]) { target = i; break; }
        }
        this.tabPlaceholderIndex = Math.max(0, Math.min(target, this.sortedTabs.length));
        // maybe auto-scroll when near container edges
        this.maybeTabAutoScroll(p);
      },
      finishTabDrag(evt) {
        const p = evt.changedTouches ? evt.changedTouches[0] : evt;
        const menu = this.$refs.favoritesMenu;
        const from = this.tabDragIndex;
        // Determine if the entire ghost is outside the menu (no intersection)
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
          // reorder
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
            // 指针垂直位置离选项卡行太远，停止此模式的自动滚动
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
             // 每一帧都检查：只有当手指还在“靠近选项卡行”的纵向带状区域内才继续滚动
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
              // 滚动后重新计算占位索引
              const tabEls = Array.from(tabs.querySelectorAll('.fav-tab'));
              const rects = tabEls.map(el => el.getBoundingClientRect());
              const centers = rects.map(r => (r.left + r.right) / 2);
              let target = centers.length;
              for (let i = 0; i < centers.length; i++) {
                if (this.tabDragX < centers[i]) { target = i; break; }
              }
              this.tabPlaceholderIndex = Math.max(0, Math.min(target, this.sortedTabs.length));
            } else if (usingItemDrag) {
              // 拖拽收藏项时维持 tab hover 逻辑
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
          // Use vertical wheel to scroll horizontally
          const dx = Math.abs(evt.deltaY) > Math.abs(evt.deltaX) ? evt.deltaY : evt.deltaX;
          if (!dx) return;
          const max = tabs.scrollWidth - tabs.clientWidth;
          let next = tabs.scrollLeft + dx;
          if (next < 0) next = 0;
          if (next > max) next = max;
          if (next !== tabs.scrollLeft) {
            tabs.scrollLeft = next;
            // If dragging, update placeholder based on new positions
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
        // While dragging tabs, prevent native horizontal scrolling of the tab bar
        if (this.tabDragging) {
          try {
            if (evt && typeof evt.preventDefault === 'function' && evt.cancelable) {
              evt.preventDefault();
            }
          } catch (e) {}
        }
      },
      getDraggedTabWidth() {
        // Measure dragged tab DOM width to match exactly
        try {
          const tabs = this.$refs.favTabs;
          const els = tabs ? Array.from(tabs.querySelectorAll('.fav-tab')) : [];
          const dragEl = els[this.tabDragIndex];
          if (dragEl) {
            const rw = Math.round(dragEl.getBoundingClientRect().width);
            if (rw && rw > 0) return rw;
          }
        } catch (e) {}
        const dragW = (this.tabFixedWidths && typeof this.tabFixedWidths[this.tabDragIndex] === 'number') ? this.tabFixedWidths[this.tabDragIndex] : 0;
        const guess = this.tabPlaceholderWidth || this.tabGhostWidth || dragW || 40;
        return Math.max(10, Math.round(guess));
      },
      confirmDeleteTab(id) {
        this.tabDeleteTargetId = id;
        this.tabDeleteConfirmVisible = true;
      },
      cancelDeleteTab() {
        this.tabDeleteConfirmVisible = false;
        this.tabDeleteTargetId = null;
      },
      performDeleteTab() {
        const id = this.tabDeleteTargetId;
        if (!id) { this.cancelDeleteTab(); return; }
                // 在删除整个收藏列表前，清理自创景点缓存与缩略图
        try {
          const tab = this.favoriteTabs.find(t => t.id === id);
          const items = tab && Array.isArray(tab.items) ? tab.items : [];
          items.forEach(it => {
            if (String(it.country) === 'custom') {
              let keysToDelete = [];
              try {
                const custom = findCustomAttractionById(it.id);
                // 检查是否来自导入，如果是则不删除S3上的图片
                const isImported = custom && custom.isImported === true;
                if (!isImported) {
                  const imgs = custom && custom.images ? custom.images : {};
                  const sec = Array.isArray(imgs.secondary) ? imgs.secondary : [];
                  if (imgs.main) keysToDelete.push(imgs.main);
                  if (sec[0]) keysToDelete.push(sec[0]);
                  if (sec[1]) keysToDelete.push(sec[1]);
                }
              } catch (e) {}
              try { deleteCustomAttraction(it.id); } catch(e) {}
              try { deleteCustomImagesForId(it.id); } catch(e) {}
              try { if (keysToDelete.length) deleteCustomImages(keysToDelete); } catch (e) {}
              try { this.removeGeoCacheForCustom(it.id); } catch(e) {}
            }
            const key = this.thumbKey ? this.thumbKey(it) : (it.country + '-' + it.id);
            if (this.favThumbs && this.favThumbs[key]) { try { URL.revokeObjectURL(this.favThumbs[key]); } catch(e){}; this.$delete ? this.$delete(this.favThumbs, key) : delete this.favThumbs[key]; }
          });
        } catch (e) {}
        const idx = this.favoriteTabs.findIndex(t => t.id === id);
        if (idx >= 0) {
          this.favoriteTabs.splice(idx, 1);
          this.normalizeTabsOrder();
          if (!this.favoriteTabs.length) {
            const t = { id: this.uid(), name: '新的收藏', items: [], order: 1 };
            this.favoriteTabs.push(t);
          }
          if (!this.favoriteTabs.find(t => t.id === this.activeTabId)) {
            const lastTab = this.favoriteTabs[this.favoriteTabs.length - 1];
            this.activeTabId = lastTab ? lastTab.id : this.favoriteTabs[0].id;
          }
          const at = this.favoriteTabs.find(t => t.id === this.activeTabId);
          this.favorites = at ? at.items : [];
          this.saveFavorites();
        }
        this.cancelDeleteTab();
      },
      attachEditOutsideListeners(editId) {
        this._onEditOutside = (e) => {
          try {
            const refName = 'tabEdit_' + editId;
            const el = this.$refs[refName] && (Array.isArray(this.$refs[refName]) ? this.$refs[refName][0] : this.$refs[refName]);
            const t = e.target;
            const inside = el && (el === t || (el.contains && el.contains(t)));
            if (!inside) {
              if (e && typeof e.preventDefault === 'function') e.preventDefault();
              if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
              this.finishEditTab(true);
            }
          } catch (err) {
            this.finishEditTab(true);
          }
        };
        document.addEventListener('mousedown', this._onEditOutside, true);
        document.addEventListener('touchstart', this._onEditOutside, true);
      },
      detachEditOutsideListeners() {
        try {
          document.removeEventListener('mousedown', this._onEditOutside, true);
          document.removeEventListener('touchstart', this._onEditOutside, true);
        } catch(e) {}
        this._onEditOutside = null;
      },
      // 点击收藏菜单中的项：跳转详情并以收藏顺序驱动导航
      handleMenuItemClick(f, idx, evt) {
        if (this.favoritesContextMenuVisible || this.favoritesContextMenuInteractionLock) {
          if (evt && typeof evt.preventDefault === 'function') evt.preventDefault();
          if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
          this.closeFavoritesContextMenu({ keepLock: true, unlockDelay: 250 });
          return;
        }
        this.closeFavoritesContextMenu();
        if (this.dragging) return;
        try {
          const color = this.getRatingColor(f.rating);
          localStorage.setItem('selectedAttractionRatingColor', color);
        } catch(e) {}
        // 记录返回目标：当前列表页完整路径（包含筛选与页码）
        try { localStorage.setItem('lastAttractionsRoute', this.$route.fullPath || ''); } catch(e) {}
const all = this.sortedFavorites || [];
        let nav = [];
        let newIdx = 0;
        if (f && !f.pending) {
          const active = all.filter(x => !x.pending).map(x => ({ country: x.country, id: x.id }));
          nav = active;
          const findIdx = active.findIndex(x => String(x.id) === String(f.id) && String(x.country||'') === String(f.country||''));
          newIdx = findIdx >= 0 ? findIdx : 0;
        } else {
          // 待定项：浏览队列仅包含自身
          nav = [{ country: f.country, id: f.id }];
          newIdx = 0;
        }
        localStorage.setItem('favNav', JSON.stringify(nav));
        localStorage.setItem('favIndex', String(newIdx));
        this.setClickGuard();
        this.showFavorites = false;
        const __q = (f && f.pending) ? "?from=favorites&pendingNav=1" : "?from=favorites";
        this.$router.push(`/attraction/${f.country}/${f.id}${__q}`);
      },
      // 卡片长按处理
      startCardPress(attraction, evt) {
        if (this.showFavorites || this.clickGuard) return;
        this.cancelCardPress();
        if (evt && evt.touches && evt.touches[0]) {
          this.cardTouchStartX = evt.touches[0].clientX;
          this.cardTouchStartY = evt.touches[0].clientY;
          this.cardTouchMoved = false;
        }
        this.pressTimer = setTimeout(() => {
          this.toggleFavorite(attraction);
          this.suppressNextClick = true;
        }, this.longPressThreshold);
      },
      onCardTouchMove(evt) {
        if (!this.pressTimer) return;
        if (!evt || !evt.touches || !evt.touches[0]) return;
        const t = evt.touches[0];
        const dx = t.clientX - this.cardTouchStartX;
        const dy = t.clientY - this.cardTouchStartY;
        if (Math.hypot(dx, dy) > this.cardTouchTolerance) {
          this.cardTouchMoved = true;
          this.cancelCardPress();
        }
      },
      cancelCardPress() {
        if (this.pressTimer) {
          clearTimeout(this.pressTimer);
          this.pressTimer = null;
        }
      },
      endCardPress() {
        this.cancelCardPress();
        // 触摸结束后重置移动标记
        this.cardTouchMoved = false;
      },
      // 收藏菜单按钮与弹层
      toggleFavoritesMenu() {
        this.showFavorites = !this.showFavorites;
        this.resetSwipeState(true);
        if (this.showFavorites) {
          // 确保收藏列表已加载，避免在景点卡片加载前点击导致清空收藏列表
          if (!this.favoriteTabs || this.favoriteTabs.length === 0 || !this.activeTabId) {
            this.loadFavorites();
          }
          // 打开时刷新一次自创景点的信息（名称/区域等）
          try { this.refreshCustomFavorites(); this.saveFavorites(); } catch(e) {}
          this.updateFavoritesMenuPosition();
          this.$nextTick(() => {
            this.updateFavoritesListScroll();
            document.addEventListener('mousedown', this.onOutsideClick, { capture: true });
            document.addEventListener('touchstart', this.onOutsideClick, { capture: true });
            window.addEventListener('resize', this.updateFavoritesMenuPosition, { passive: true });
            window.addEventListener('scroll', this.updateFavoritesMenuPosition, { passive: true });
            // 预加载收藏缩略图
            try { this.sortedFavorites.forEach(f => this.ensureFavThumb(f)); } catch(e) {}
          });
        } else {
          // 关闭菜单时，重置所有滑动相关状态
          this.favActionId = null;
          this.favSwipeActive = false;
          this.favSwipeItemId = null;
          this.favSwipeOffsetX = 0;
          this.favListTouchScrolling = false;
          this.setClickGuard();
          this.stopAutoScroll();
          this.dragBoundaries = [];
          document.removeEventListener('mousedown', this.onOutsideClick, { capture: true });
          document.removeEventListener('touchstart', this.onOutsideClick, { capture: true });
          window.removeEventListener('resize', this.updateFavoritesMenuPosition);
          window.removeEventListener('scroll', this.updateFavoritesMenuPosition);
        }
      },
      onFavoriteContextMenu(f, idx, evt) {
        if (!f) return;
        if (this.isTouchDevice && this.isTouchDevice()) return;
        this.closeFavoritesContextMenu();
        if (evt && typeof evt.preventDefault === 'function') evt.preventDefault();
        if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
        this.favoritesContextMenuTarget = f;
        this.updateFavoritesContextMenuPosition(evt);
        this.favoritesContextMenuVisible = true;
        this.engageFavoritesContextMenuLock();
        this.$nextTick(() => {
          this.ensureFavoritesContextMenuInBounds();
          this.attachFavoritesContextMenuGuards();
        });
      },
      updateFavoritesContextMenuPosition(evt) {
        let x = 0;
        let y = 0;
        try {
          if (evt && evt.clientX != null && evt.clientY != null) {
            x = evt.clientX;
            y = evt.clientY;
          } else {
            const menu = this.$refs.favoritesMenu && this.$refs.favoritesMenu.getBoundingClientRect
              ? this.$refs.favoritesMenu.getBoundingClientRect()
              : null;
            if (menu) {
              x = menu.left || 0;
              y = menu.top || 0;
            }
          }
          const padding = 8;
          const approxWidth = 184;
          const approxHeight = 120;
          const vw = window.innerWidth || document.documentElement.clientWidth || 0;
          const vh = window.innerHeight || document.documentElement.clientHeight || 0;
          if (x + approxWidth + padding > vw) x = Math.max(padding, vw - approxWidth - padding);
          if (y + approxHeight + padding > vh) y = Math.max(padding, vh - approxHeight - padding);
          if (x < padding) x = padding;
          if (y < padding) y = padding;
        } catch (e) {}
        this.favoritesContextMenuStyle = {
          left: x + 'px',
          top: y + 'px',
        };
      },
      ensureFavoritesContextMenuInBounds() {
        const menu = this.$refs.favoritesContextMenu;
        if (!menu || !menu.getBoundingClientRect) return;
        const rect = menu.getBoundingClientRect();
        const vw = window.innerWidth || document.documentElement.clientWidth || 0;
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        let x = rect.left;
        let y = rect.top;
        let changed = false;
        const padding = 8;
        if (rect.right > vw - padding) {
          x = Math.max(padding, vw - rect.width - padding);
          changed = true;
        }
        if (rect.bottom > vh - padding) {
          y = Math.max(padding, vh - rect.height - padding);
          changed = true;
        }
        if (rect.left < padding) {
          x = padding;
          changed = true;
        }
        if (rect.top < padding) {
          y = padding;
          changed = true;
        }
        if (changed) {
          this.favoritesContextMenuStyle = { left: x + 'px', top: y + 'px' };
        }
      },
      attachFavoritesContextMenuGuards() {
        if (this.favoritesContextMenuOutsideHandler || this.favoritesContextMenuDismissHandler) return;
        this.favoritesContextMenuOutsideHandler = (evt) => {
          const menu = this.$refs.favoritesContextMenu;
          if (menu && menu.contains && menu.contains(evt.target)) return;
          if (evt) {
            if (typeof evt.preventDefault === 'function') evt.preventDefault();
            if (typeof evt.stopImmediatePropagation === 'function') evt.stopImmediatePropagation();
            if (typeof evt.stopPropagation === 'function') evt.stopPropagation();
          }
          this.closeFavoritesContextMenu({ keepLock: true, unlockDelay: 250 });
        };
        this.favoritesContextMenuDismissHandler = () => {
          this.closeFavoritesContextMenu();
        };
        document.addEventListener('mousedown', this.favoritesContextMenuOutsideHandler, true);
        document.addEventListener('touchstart', this.favoritesContextMenuOutsideHandler, true);
        document.addEventListener('click', this.favoritesContextMenuOutsideHandler, true);
        document.addEventListener('touchend', this.favoritesContextMenuOutsideHandler, true);
        document.addEventListener('scroll', this.favoritesContextMenuDismissHandler, true);
        window.addEventListener('resize', this.favoritesContextMenuDismissHandler, { passive: true });
        window.addEventListener('blur', this.favoritesContextMenuDismissHandler);
      },
      detachFavoritesContextMenuGuards() {
        if (this.favoritesContextMenuOutsideHandler) {
          document.removeEventListener('mousedown', this.favoritesContextMenuOutsideHandler, true);
          document.removeEventListener('touchstart', this.favoritesContextMenuOutsideHandler, true);
          document.removeEventListener('click', this.favoritesContextMenuOutsideHandler, true);
          document.removeEventListener('touchend', this.favoritesContextMenuOutsideHandler, true);
          this.favoritesContextMenuOutsideHandler = null;
        }
        if (this.favoritesContextMenuDismissHandler) {
          document.removeEventListener('scroll', this.favoritesContextMenuDismissHandler, true);
          window.removeEventListener('resize', this.favoritesContextMenuDismissHandler);
          window.removeEventListener('blur', this.favoritesContextMenuDismissHandler);
          this.favoritesContextMenuDismissHandler = null;
        }
      },
      engageFavoritesContextMenuLock() {
        if (this.favoritesContextMenuLockTimer) {
          clearTimeout(this.favoritesContextMenuLockTimer);
          this.favoritesContextMenuLockTimer = null;
        }
        this.favoritesContextMenuInteractionLock = true;
      },
      scheduleFavoritesContextMenuUnlock(delay = 50) {
        if (this.favoritesContextMenuLockTimer) {
          clearTimeout(this.favoritesContextMenuLockTimer);
          this.favoritesContextMenuLockTimer = null;
        }
        this.favoritesContextMenuLockTimer = setTimeout(() => {
          this.favoritesContextMenuInteractionLock = false;
          this.favoritesContextMenuLockTimer = null;
        }, Math.max(0, delay));
      },
      closeFavoritesContextMenu(options = {}) {
        const { keepLock = false, unlockDelay } = options || {};
        if (keepLock) this.engageFavoritesContextMenuLock();
        if (!this.favoritesContextMenuVisible && !this.favoritesContextMenuOutsideHandler && !this.favoritesContextMenuDismissHandler) {
          if (keepLock) this.scheduleFavoritesContextMenuUnlock(unlockDelay == null ? 250 : unlockDelay);
          return;
        }
        this.favoritesContextMenuVisible = false;
        this.favoritesContextMenuTarget = null;
        this.favoritesContextMenuStyle = {};
        this.detachFavoritesContextMenuGuards();
        const delay = unlockDelay == null ? (keepLock ? 250 : 50) : unlockDelay;
        this.scheduleFavoritesContextMenuUnlock(delay);
      },
      onFavoritesContextMenuRemove() {
        const t = this.favoritesContextMenuTarget;
        this.closeFavoritesContextMenu();
        if (t) this.removeFavorite(t);
      },
      onFavoritesContextMenuPending() {
        const t = this.favoritesContextMenuTarget;
        this.closeFavoritesContextMenu();
        if (t) this.togglePending(t);
      },
      refreshCustomFavorites() {
        try {
          const updateItem = (it) => {
            if (!it || String(it.country) !== 'custom') return;
            const a = findCustomAttractionById(it.id);
            if (a) {
              if (a.name) it.name = a.name;
              if (a.region !== undefined) it.region = a.region;
              if (a.county !== undefined) it.county = a.county;
            }
          };
          // 更新所有 tab 中的自创收藏项
          (this.favoriteTabs || []).forEach(t => {
            if (Array.isArray(t.items)) t.items.forEach(updateItem);
          });
          // 绑定 favorites 引用的安全刷新
          const at = this.favoriteTabs.find(t => t.id === this.activeTabId);
          this.favorites = at ? at.items : [];
        } catch (e) {}
      },
      thumbKey(f) {
        const base = `${f.country}-${f.id}`;
        if (String(f.country) !== 'custom') return base;
        // 对自创景点：将当前主图引用一起纳入 key，避免更换主图后仍复用旧缩略图缓存
        try {
          const a = findCustomAttractionById(f.id);
          const mainRef = a && a.images && a.images.main;
          return `${base}-${mainRef || 'none'}`;
        } catch (e) {
          return base;
        }
      },
      favoritesListEl() {
        const ref = this.$refs.favoritesList;
        if (!ref) return null;
        return ref.$el ? ref.$el : ref;
      },
      async ensureFavThumb(f) {
        const key = this.thumbKey(f);
        if (this.favThumbs[key]) return;
        try {
          if (String(f.country) === 'custom') {
            const a = findCustomAttractionById(f.id);
            let url = '';
            if (a && a.images && a.images.main) {
              // 如果images.main是S3路径（包含/），直接使用
              // 否则尝试作为本地key（id:slot格式）
              const imageKey = a.images.main;
              url = await getCustomImageUrl(imageKey);
              // 调试：检查图片加载
              if (!url) {
                try {
                  if (imageKey.includes('/')) {
                    console.warn('[Thumb] Failed to load S3 image:', imageKey, 'This may be due to permissions or the image not existing on S3');
                  } else {
                    // 尝试使用id:slot格式作为fallback
                    if (a && a.hasImage1) {
                      url = await getCustomImageUrl(`${f.id}:main`);
                    }
                  }
                } catch (e) {}
              }
            } else if (a && a.hasImage1) {
              // 如果没有images.main但有hasImage1标记，尝试使用id:main格式
              url = await getCustomImageUrl(`${f.id}:main`);
            }
            if (url) {
              this.$set ? this.$set(this.favThumbs, key, url) : (this.favThumbs[key] = url);
            }
            return;
          }
          // 非自创景点：允许走全局 fetchCache（IndexedDB）做离线/加速缓存
          const imageUrl = `https://juseaxerf.com/api/attraction-image/${f.country}/${f.id}/1`;
          const res = await fetch(imageUrl, withBackendApiKey());
          if (!res.ok) return;
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          this.$set ? this.$set(this.favThumbs, key, url) : (this.favThumbs[key] = url);
        } catch (e) {}
      },
      onOutsideClick(e) {
        // 当确认对话框/导出/创建弹窗打开时，保持收藏菜单不自动关闭
        if (this.itemDeleteConfirmVisible || this.tabDeleteConfirmVisible || this.showCreateModal || this.showExportModal) return;
        // 当创建自创景点弹窗打开时，保持收藏菜单不自动关闭
        if (this.showCreateModal) return;
        const menu = this.$refs.favoritesMenu;
        const btns = [
          this.$refs.favoritesButtonDesktop,
          this.$refs.favoritesButtonMobile,
        ].filter(Boolean);
        const ctxMenu = this.$refs.favoritesContextMenu;
        if (!menu || !btns.length) return;
        const t = e.target;
        const inAnyBtn = btns.some(b => b && b.contains && b.contains(t));
        const inContextMenu = ctxMenu && ctxMenu.contains && ctxMenu.contains(t);
        if (menu.contains(t) && !inContextMenu && this.favoritesContextMenuVisible) {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          this.closeFavoritesContextMenu({ keepLock: true, unlockDelay: 250 });
          return;
        }
        if (!menu.contains(t) && !inAnyBtn && !inContextMenu) {
          if (this.favoritesContextMenuVisible) {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            this.closeFavoritesContextMenu({ keepLock: true, unlockDelay: 250 });
            return;
          }
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          this.setClickGuard();
          this.showFavorites = false;
          document.removeEventListener('mousedown', this.onOutsideClick, { capture: true });
          document.removeEventListener('touchstart', this.onOutsideClick, { capture: true });
        }
      },
      setClickGuard() {
        try {
          if (this.clickGuardTimer) clearTimeout(this.clickGuardTimer);
        } catch (e) {}
        this.clickGuard = true;
        this.clickGuardTimer = setTimeout(() => {
          this.clickGuard = false;
          this.clickGuardTimer = null;
        }, 300);
      },
      updateSwipeEnabled() {
        try {
          const widthOk = (window.innerWidth || document.documentElement.clientWidth || 0) < 1024;
          const coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
          const hoverNone = window.matchMedia ? window.matchMedia('(hover: none)').matches : false;
          const enabled = widthOk && (coarse || hoverNone);
          if (!enabled) this.resetSwipeState(true);
          this.swipeEnabled = enabled;
        } catch (e) {
          this.swipeEnabled = false;
        }
      },
      onFavoritesBackdropClick() {
        this.setClickGuard();
        this.showFavorites = false;
      },
      updateFavoritesMenuPosition() {
        this.$nextTick(() => {
          const candidates = [
            this.$refs.favoritesButtonDesktop,
            this.$refs.favoritesButtonMobile,
          ].filter(Boolean);
          // 选择实际可见按钮：有布局盒且尺寸>0
          const btn = candidates.find(el => {
            if (!el) return false;
            const rects = el.getClientRects ? el.getClientRects() : null;
            return rects && rects.length > 0 && el.offsetWidth > 0 && el.offsetHeight > 0;
          });
          if (!btn) return; // 未找到可见按钮，不定位
          const rect = btn.getBoundingClientRect();
          const width = 320;
          const vw = window.innerWidth || document.documentElement.clientWidth || 0;
          const left = Math.min(Math.max(12, rect.left), Math.max(12, vw - width - 12));
          this.favoritesMenuStyle = {
            top: `${rect.bottom + 6}px`,
            left: `${left}px`,
            width: `${width}px`,
            position: 'fixed',
            zIndex: 1000,
          };
        });
      },
      updateFavoritesListScroll() {
        if (!this.showFavorites) return;
        this.$nextTick(() => {
          const list = this.favoritesListEl();
          if (!list) return;
          const items = Array.from(list.querySelectorAll('.favorites-item'));
          if (items.length <= 7) {
            this.favoritesListStyle = {};
          } else {
            const measureItems = items.slice(0, 7);
            let totalHeight = 0;
            measureItems.forEach(el => {
              const rect = el.getBoundingClientRect();
              totalHeight += rect.height;
            });
            let gap = 0;
            if (measureItems.length > 1) {
              const firstRect = measureItems[0].getBoundingClientRect();
              const secondRect = measureItems[1].getBoundingClientRect();
              const computedGap = secondRect.top - firstRect.bottom;
              gap = computedGap > 0 ? computedGap : 0;
            } else {
              const styles = window.getComputedStyle(list);
              const rawGap = parseFloat(styles.rowGap || styles.gap || '0');
              gap = Number.isFinite(rawGap) ? rawGap : 0;
            }
            totalHeight += gap * (measureItems.length - 1);
            const maxHeight = Math.ceil(totalHeight);
            const needsScroll = list.scrollHeight > maxHeight + 1;
            this.favoritesListStyle = {
              maxHeight: `${maxHeight}px`,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingRight: needsScroll ? '6px' : '',
            };
          }
          if (this.dragging) {
            const itemEls = Array.from(list.querySelectorAll('.favorites-item'));
            this.captureDragMetrics(itemEls, list);
          }
        });
      },
      // 收藏项右滑删除的触摸处理
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
            // 右滑
            if (this.favRightActionId && this.favRightActionId === this.favRightSwipeItemId) {
              // 已固定右侧“待定”时：右滑只用于关闭右侧，不允许露出左侧
              const base = -this.favRightSwipeMaxReveal;
              const offset = Math.min(0, base + dx);
              this.favRightSwipeOffsetX = offset;
              this.favActionId = null;
              this.favSwipeOffsetX = 0;
              if (evt.cancelable) evt.preventDefault();
            } else {
              // 正常露出左侧“移除”
              this.favRightActionId = null;
              this.favRightSwipeOffsetX = 0;
              const offset = Math.max(0, Math.min(this.favSwipeMaxReveal, dx));
              this.favSwipeOffsetX = offset;
              if (evt.cancelable) evt.preventDefault();
            }
          } else if (dx < 0) {
            // 左滑
            if (this.favActionId && this.favActionId === this.favSwipeItemId) {
              // 已固定左侧“移除”时：左滑只用于关闭左侧，不允许露出右侧
              const base = this.favSwipeMaxReveal;
              const offset = Math.max(0, base + dx);
              this.favSwipeOffsetX = offset;
              this.favRightActionId = null;
              this.favRightSwipeOffsetX = 0;
              if (evt.cancelable) evt.preventDefault();
            } else {
              // 正常露出右侧“待定”
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
      removeFavorite(f) {
        if (!f) return;
        this.closeFavoritesContextMenu();
        // 任何收藏（含非自创）都弹确认
        this.itemDeleteTarget = { ...f };
        this.itemDeleteConfirmVisible = true;
      },
      cancelDeleteItem() {
        this.itemDeleteConfirmVisible = false;
        this.itemDeleteTarget = null;
        // 重置右滑展开状态
        if (this.favActionId) this.favActionId = null;
        this.favSwipeOffsetX = 0;
        if (this.favRightActionId) this.favRightActionId = null;
        this.favRightSwipeOffsetX = 0;
      },
      performDeleteItem() {
        const t = this.itemDeleteTarget;
        if (!t) return;
        // 仅从当前激活的收藏 tab 中移除该项
        try {
          const activeTab = this.favoriteTabs.find(tab => tab.id === this.activeTabId);
          if (activeTab && Array.isArray(activeTab.items)) {
            const idx = activeTab.items.findIndex(x => String(x.id) === String(t.id) && String(x.country||'') === String(t.country||''));
            if (idx >= 0) {
              activeTab.items.splice(idx, 1);
              this.normalizeFavoritesOrder();
              this.saveFavorites();
            }
          }
        } catch (e) {}
        // 注意：移除操作只影响当前激活的选项卡，不删除自创景点本身（因为其他选项卡可能还在使用）
        // 清除自创景点缓存（若为自创）
        if (String(t.country) === 'custom') {
          let keysToDelete = [];
          try {
            const custom = findCustomAttractionById(t.id);
            // 检查是否来自导入，如果是则不删除S3上的图片
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
          try { this.removeGeoCacheForCustom(t.id); } catch (e) {}
        }
        // 清理缩略图缓存（统一处理）
        const key = this.thumbKey(t);
        if (this.favThumbs[key]) { try { URL.revokeObjectURL(this.favThumbs[key]); } catch(e){}; this.$delete ? this.$delete(this.favThumbs, key) : delete this.favThumbs[key]; }
        this.itemDeleteConfirmVisible = false;
        this.itemDeleteTarget = null;
        this.$nextTick(() => this.updateFavoritesListScroll());
      },
      isFavActionsVisible(f) {
        if (!f) return false;
        if (this.favActionId === f.id) return true; // 固定展开
        // 右滑进行中且已位移 > 0 时显示
        if (this.favSwipeItemId === f.id && (this.favSwipeOffsetX || 0) > 0) return true;
        return false;
      },
      isFavRightActionsVisible(f) {
        if (!f) return false;
        if (this.favRightActionId === f.id) return true; // 固定展开
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
        // 收起任意展开
        this.favActionId = null;
        this.favSwipeOffsetX = 0;
        this.favRightActionId = null;
        this.favRightSwipeOffsetX = 0;
        this.saveFavorites();
        this.$nextTick(() => this.updateFavoritesListScroll());
      },
      getNonPendingIndex(i) {
        if (i == null || i < 0) return "";
        const upto = this.sortedFavorites.slice(0, i + 1);
        return upto.filter(x => !x.pending).length;
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
          // 一旦判定为滚动，立即收起任何展开删除状态
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
        // 触摸结束后，短暂保留滚动判定，防止尾段抖动触发
        setTimeout(() => { this.favListTouchScrolling = false; }, 50);
      },
      // 横向滑动分页（景点列表）
      clearSwipeResetTimer() {
        if (this.swipeResetTimer) {
          clearTimeout(this.swipeResetTimer);
          this.swipeResetTimer = null;
        }
      },
      resetSwipeState(immediate = false, targetOpacity = 1) {
        this.clearSwipeResetTimer();
        this.swipeTracking = false;
        this.swipeEligible = false;
        this.swipeDirection = null;
        this.swipeProgress = 0;
        this.swipeCanTrigger = false;
        if (immediate) {
          this.swipeResetting = false;
          this.swipeOpacity = targetOpacity;
        } else {
          this.swipeResetting = true;
          this.swipeOpacity = targetOpacity;
          this.swipeResetTimer = setTimeout(() => {
            this.swipeResetting = false;
            this.swipeResetTimer = null;
          }, 200);
        }
      },
      canSwipeList(direction) {
        if (direction === 'left') return this.page < this.totalPages;
        if (direction === 'right') return this.page > 1;
        return false;
      },
      isMobileViewport() {
        try { return (window.innerWidth || document.documentElement.clientWidth || 0) < 1024; } catch(e) { return false; }
      },
      isTouchDevice() {
        try {
          return (
            (window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false) ||
            (window.matchMedia ? window.matchMedia('(hover: none)').matches : false)
          );
        } catch(e) { return false; }
      },
      onListSwipeStart(evt) {
        if (window.innerWidth > 768) return;
        if (this.showFavorites || this.loading) return;
        if (!this.swipeEnabled) return;
        if (!this.isMobileViewport() || !this.isTouchDevice()) return;
        if (evt.touches && evt.touches.length > 1) return;
        const touch = evt.touches ? evt.touches[0] : null;
        if (!touch) return;
        this.clearSwipeResetTimer();
        this.swipeTracking = true;
        this.swipeEligible = false;
        this.swipeDirection = null;
        this.swipeProgress = 0;
        this.swipeCanTrigger = false;
        this.swipeResetting = false;
        this.swipeStartX = touch.clientX;
        this.swipeStartY = touch.clientY;
      },
      onListSwipeMove(evt) {
        if (!this.swipeTracking || this.showFavorites || !this.swipeEnabled) return;
        if (!evt.touches || evt.touches.length > 1) {
          this.resetSwipeState(true);
          return;
        }
        const touch = evt.touches[0];
        const dx = touch.clientX - this.swipeStartX;
        const dy = touch.clientY - this.swipeStartY;
        if (!this.swipeDirection) {
          if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
            this.swipeDirection = dx > 0 ? 'right' : 'left';
            this.swipeEligible = true;
          } else if (Math.abs(dy) > 12) {
            this.resetSwipeState(true);
            return;
          } else {
            return;
          }
        }
        if (!this.swipeEligible) return;
        const canTrigger = this.canSwipeList(this.swipeDirection);
        this.swipeCanTrigger = canTrigger;
        const absDx = Math.abs(dx);
        const progress = Math.min(1, absDx / this.swipeTriggerDistance);
        this.swipeProgress = progress;
        const fadeFactor = 0.8; // 阈值时约20%不透明（80%透明）
        this.swipeOpacity = Math.max(0.2, 1 - fadeFactor * progress);
        if (Math.abs(dx) > Math.abs(dy) && evt.cancelable) evt.preventDefault();
      },
      onListSwipeEnd() {
        if (!this.swipeTracking || !this.swipeEnabled) return;
        const shouldTrigger = this.swipeEligible && this.swipeProgress >= 1 && this.swipeCanTrigger;
        const direction = this.swipeDirection;
        this.resetSwipeState(false, shouldTrigger ? 0.2 : 1);
        if (shouldTrigger && direction) {
          if (direction === 'left') this.nextPage();
          else this.prevPage();
        }
      },
      onListSwipeCancel() {
        if (!this.swipeTracking || !this.swipeEnabled) return;
        this.resetSwipeState(false);
      },
      onFavoritesNodeMouseDown(node, evt) {
        if (!node || node.type !== 'item') return;
        if (evt && typeof evt.button === 'number' && evt.button !== 0) return;
        if (evt && evt.preventDefault) evt.preventDefault();
        this.startMenuItemPress(node.index, evt);
      },
      onFavoritesNodeTouchStart(node, evt) {
        if (!node || node.type !== 'item') return;
        this.startMenuItemPress(node.index, evt);
        this.onFavTouchStart(node.f, node.index, evt);
      },
      onFavoritesNodeTouchMove(node, evt) {
        if (!node || node.type !== 'item') return;
        this.onFavTouchMove(evt);
      },
      onFavoritesNodeTouchEnd(node, evt) {
        if (!node || node.type !== 'item') return;
        this.onFavTouchEnd(node.f, node.index, evt);
      },
      onFavoritesNodeClick(node, evt) {
        if (!node || node.type !== 'item') return;
        if (evt && evt.stopPropagation) evt.stopPropagation();
        this.handleMenuItemClick(node.f, node.index, evt);
      },
      onFavoritesNodeContextMenu(node, evt) {
        if (!node || node.type !== 'item') return;
        if (evt && evt.preventDefault) evt.preventDefault();
        if (evt && evt.stopPropagation) evt.stopPropagation();
        this.onFavoriteContextMenu(node.f, node.index, evt);
      },
      // 菜单内长按拖拽
      startMenuItemPress(index, evt) {
        if (evt && typeof evt.button === 'number' && evt.button !== 0) return;
        this.closeFavoritesContextMenu();
        const e = evt.touches ? evt.touches[0] : evt;
        const startX = e.clientX;
        const startY = e.clientY;
        const touchId = evt.touches ? evt.touches[0].identifier : null;
        // 记录起始元素的位置信息，避免占位符插入后索引错位
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
        // 优先用列表中第 index 个真实项的矩形，避免占位符干扰
        const itemEls = Array.from(list.querySelectorAll('.favorites-item'));
        const elRect = (itemEls[index] && itemEls[index].getBoundingClientRect) ? itemEls[index].getBoundingClientRect() : null;
        const baseRect = elRect || originRect || this.dragListRect;
        this.dragOffsetY = startClientY - baseRect.top;
        this.dragY = startClientY;
        this.placeholderIndex = index;
        // 记录占位框与项同高
        try {
          let ph = 0;
          if (elRect && elRect.height) ph = elRect.height;
          else if (itemEls[0]) ph = itemEls[0].getBoundingClientRect().height || 0;
          if (ph) this.placeholderStyle = { height: ph + 'px' };
        } catch(e) { this.placeholderStyle = {}; }
        // 进入拖拽时重置右滑删除与滚动检测状态
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

        // 优先用“视觉位置”（getBoundingClientRect，包含 transform），并排除 leave 阶段的绝对定位节点
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

        // 兜底：按 DOM 顺序计数（同样排除绝对定位 leave 节点）
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
            // Dropping outside the menu prompts the removal confirmation.
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
              // placeholderIndex 的语义基于“拖拽项仍在列表里”，同 tab 且向下拖时需要 -1 才是最终插入位
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
              // 保持 targetItems 引用不变（避免 favorites 指针失效），但顺序严格按占位框插入点更新
              targetItems.splice(0, targetItems.length, ...orderedTarget);
              movedId = moved && moved.id ? moved.id : draggedId;
              this.normalizeTabItemsOrder(targetTab);
              if (this.activeTabId === targetTab.id) {
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
      updateMobileAttractionDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.mobileAttractionInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.mobileAttractionDropdownStyle = {
              top: `${rect.bottom}px`,      // 下方对齐
              left: `${rect.left}px`,       // 左边对齐
              width: `${rect.width}px`,
              position: 'fixed',
            };
          }
        });
      },

      updateMobileCountyDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.mobileCountyInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.mobileCountyDropdownStyle = {
              top: `${rect.bottom}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              position: 'fixed',
            };
          }
        });
      },

      updateMobileRegionDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.mobileRegionInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.mobileRegionDropdownStyle = {
              top: `${rect.bottom}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              position: 'fixed',
            };
          }
        });
      },


      async fetchAllAttractions() {
        try {
          // 获取所有匹配的值（包括简体和繁体）
          const allRegionValues = this.selectedRegion ? 
            this.getAllOriginalValues(this.selectedRegion, this.regionValueMap) : [''];
          const allCountyValues = this.selectedCounty ? 
            this.getAllOriginalValues(this.selectedCounty, this.countyValueMap) : [''];

          // 合并所有请求的结果
          const allAttractionsSet = new Set();
          const allAttractionsArray = [];

          for (const regionValue of allRegionValues) {
            for (const countyValue of allCountyValues) {
              const params = new URLSearchParams({
                region: regionValue || '',
                county: countyValue || ''
              }).toString();

              try {
                const res = await fetch(`https://juseaxerf.com/api/attractions-names-filtered/${this.country}?${params}`, withBackendApiKey());
                const data = await res.json();
                const attractions = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
                
                // 去重并添加到结果中
                for (const attraction of attractions) {
                  const key = `${attraction.id || attraction.name}`;
                  if (!allAttractionsSet.has(key)) {
                    allAttractionsSet.add(key);
                    allAttractionsArray.push(attraction);
                  }
                }
              } catch (err) {
                console.error('拉取部分景点失败:', err);
              }
            }
          }

          this.allAttractions = allAttractionsArray;
          console.log('✅ 已加载景点名称数量:', this.allAttractions.length);
        } catch (err) {
          console.error('拉取所有景点失败:', err);
        }
      },

      filterAttractions() {
        const q = this.attractionSearch.trim().toLowerCase();
        if (!q) {
          this.attractionSuggestions = [];
          return;
        }
        this.attractionSuggestions = this.allAttractions.filter(a =>
          a.name.toLowerCase().includes(q)
        );
      },
      

      selectAttraction(attraction) {
        this.showAttractionSuggestions = false;
        this.attractionSearch = attraction.name;
        // ✅ 直接跳转到详情页
        try { localStorage.setItem('lastAttractionsRoute', this.$route.fullPath || ''); } catch(e) {}
        // 传递列表中一致的评分背景色
        try {
          const rating = attraction && attraction.rating;
          if (rating !== undefined && rating !== null && String(rating).trim() !== '') {
            const color = this.getRatingColor(rating);
            localStorage.setItem('selectedAttractionRatingColor', color);
          } else {
            localStorage.removeItem('selectedAttractionRatingColor');
          }
        } catch (e) {}
        this.$router.push(`/attraction/${this.country}/${attraction.id}?from=search`);
      },

      hideAttractionSuggestions() {
        setTimeout(() => {
          this.showAttractionSuggestions = false;
        }, 200);
      },

      updateAttractionDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.attractionInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.attractionDropdownStyle = {
              top: `${rect.bottom}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`
            };
          }
        });
      },

      
      handleClick(attraction,index,event) {
        if (this.showFavorites || this.clickGuard) {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
          if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
          return;
        }
        event.preventDefault();
        // 若触摸发生了滑动，则不触发点击导航
        if (this.cardTouchMoved) {
          this.cardTouchMoved = false;
          return;
        }
        if (this.suppressNextClick) {
          this.suppressNextClick = false;
          return;
        }
        
        // 保存当前页的景点ID（用于向后兼容）
        const ids=[];
        localStorage.setItem('attractionIndex',index);
        for (let i = 0; i<this.attractions.length;i++) {
          ids.push(this.attractions[i].id)
        };
        console.log(ids);
        localStorage.setItem('ids',ids);
        
        // 计算当前景点在所有合并数据中的全局索引
        // 如果存在所有景点的ID列表（多请求合并的情况），使用它来计算全局索引
        try {
          const allIdsStr = localStorage.getItem('allAttractionIds');
          const allIdsPage = parseInt(localStorage.getItem('allAttractionIdsPage') || '0', 10);
          if (allIdsStr && allIdsPage === this.page) {
            // 当前页与保存的ID列表对应，计算全局索引
            const allIds = JSON.parse(allIdsStr);
            const globalIndex = allIds.findIndex(id => String(id) === String(attraction.id));
            if (globalIndex >= 0) {
              // 保存全局索引和所有ID（详情页面可以使用这些信息进行跨页导航）
              localStorage.setItem('attractionGlobalIndex', String(globalIndex));
              localStorage.setItem('allAttractionIds', allIdsStr); // 确保保存
              const allIdsTotal = localStorage.getItem('allAttractionIdsTotal');
              if (allIdsTotal) {
                localStorage.setItem('allAttractionIdsTotal', allIdsTotal);
              }
              console.log('Global index:', globalIndex, 'out of', allIds.length, '(multi-request mode)');
            } else {
              // 如果找不到，使用当前页索引计算
              const globalIndex = (this.page - 1) * this.limit + index;
              localStorage.setItem('attractionGlobalIndex', String(globalIndex));
              console.log('ID not found in allIds, calculated global index:', globalIndex);
            }
          } else {
            // 如果没有保存的ID列表（单请求情况），计算当前页的全局索引
            // 注意：这种情况下，详情页面需要通过API获取其他页的数据
            const globalIndex = (this.page - 1) * this.limit + index;
            localStorage.setItem('attractionGlobalIndex', String(globalIndex));
            // 清除之前保存的所有ID列表（如果存在），因为现在是单请求模式
            try {
              localStorage.removeItem('allAttractionIds');
              localStorage.removeItem('allAttractionIdsPage');
              localStorage.removeItem('allAttractionIdsTotal');
            } catch (e) {}
            console.log('Calculated global index:', globalIndex, '(single-request mode)');
          }
        } catch (e) {
          console.error('Failed to calculate global index:', e);
          // 如果出错，至少保存当前页的索引
          const globalIndex = (this.page - 1) * this.limit + index;
          localStorage.setItem('attractionGlobalIndex', String(globalIndex));
        }
        
        // 将列表中实际使用的背景色直接传递给详情页，保证一致
        try {
          const color = this.getRatingColor(attraction.rating);
          localStorage.setItem('selectedAttractionRatingColor', color);
        } catch(e) {}
        // 记录返回目标：当前列表页完整路径（包含筛选与页码）
        try { localStorage.setItem('lastAttractionsRoute', this.$route.fullPath || ''); } catch(e) {}
        this.$router.push(`/attraction/${this.country}/${attraction.id}`)
      },

      translateCountry(country) {
        return this.countryTranslations[country] || country;
      },

      translateCounty(country) {
        return this.countyTranslations[country] || '省份';
      },

      // 处理选项：去掉后缀、繁体转简体并合并
      // 返回：{ processed: 处理后的选项数组, valueMap: 映射Map }
      processOptions(options) {
        if (!Array.isArray(options) || options.length === 0) {
          return { processed: options, valueMap: new Map() };
        }

        // 初始化OpenCC转换器（繁体到简体）
        const converterTW = Converter({ from: 'tw', to: 'cn' });
        const converterHK = Converter({ from: 'hk', to: 'cn' });

        // 尝试加入日本新字体 -> 简体转换，如果 opencc-js 提供（取决于字典支持）
        let converterJP2S;
        try {
          converterJP2S = Converter({ from: 'jp', to: 'cn' }); // 假定存在 “jp2s” 配置
        } catch (e) {
          converterJP2S = null;
        }
        
        // 统一的转换函数：尝试多种繁体变体
        const converter = (text) => {
          // 先日本汉字
          if (converterJP2S) {
            const nj = converterJP2S(text);
            if (nj !== text) return nj;
          }
          // 再繁体转简体
          const fromTW = converterTW(text);
          if (fromTW !== text) return fromTW;
          const fromHK = converterHK(text);
          return fromHK !== text ? fromHK : text;
        };

        // 特殊名称列表（这些名称中的"都"、"州"是名字的一部分，不应该去掉）
        const specialNames = ['京都', '九州', '贵州', '坡州', '全州', '庆州', '拜县', '荣市'];

        // 映射：标准化名称 -> 原始值数组
        const valueMap = new Map();
        const processedSet = new Set();

        options.forEach(option => {
          if (!option || typeof option !== 'string') return;

          const trimmed = option.trim();
          if (!trimmed) return;

          // 先转换为简体字
          const simplified = converter(trimmed);
          
          // 检查是否是特殊名称
          const isSpecial = specialNames.some(special => 
            simplified.includes(special)
          );

          // 计算标准化名称（用于合并）
          let normalized = simplified;
          if (!isSpecial) {
            // 匹配后缀：县、省、州、市、郡（包括繁体字：縣、省、州、市、郡）
            const suffixPattern = /[縣县省州市郡]$/;
            if (suffixPattern.test(simplified)) {
              normalized = simplified.replace(suffixPattern, '');
            }
          }

          // 将原始值添加到映射中
          if (!valueMap.has(normalized)) {
            valueMap.set(normalized, []);
            processedSet.add(normalized);
          }
          // 添加原始值到映射数组（去重）
          const originalValues = valueMap.get(normalized);
          if (!originalValues.includes(trimmed)) {
            originalValues.push(trimmed);
          }
        });

        // 合项显示名规则：将短名与都/府合并，统一显示为都/府
        const mergeDisplayRules = [
          { display: '东京都', keys: ['东京都', '东京'] },
          { display: '京都府', keys: ['京都府', '京都'] },
          { display: '大阪府', keys: ['大阪府', '大阪'] }
        ];
        for (const { display, keys } of mergeDisplayRules) {
          const allOriginals = new Set();
          let hasAny = false;
          for (const k of keys) {
            if (valueMap.has(k)) {
              hasAny = true;
              (valueMap.get(k) || []).forEach(v => allOriginals.add(v));
              valueMap.delete(k);
              processedSet.delete(k);
            }
          }
          if (hasAny && allOriginals.size > 0) {
            valueMap.set(display, Array.from(allOriginals));
            processedSet.add(display);
          }
        }

        // 返回处理后的选项列表（已排序）和映射
        return {
          processed: Array.from(processedSet).sort(),
          valueMap: valueMap
        };
      },

      // 将处理后的值转换为原始值（用于API调用）
      // 如果找不到映射，返回原值
      // 优先返回繁体的原始值（如果存在），因为API数据可能使用繁体
      getOriginalValue(processedValue, valueMap) {
        if (!processedValue || !valueMap) return processedValue;
        const originalValues = valueMap.get(processedValue);
        if (originalValues && originalValues.length > 0) {
          // 优先返回繁体的原始值（如果存在）
          const traditionalValue = originalValues.find(val => {
            const converterTW = Converter({ from: 'tw', to: 'cn' });
            const converterHK = Converter({ from: 'hk', to: 'cn' });
            return converterTW(val) !== val || converterHK(val) !== val;
          });
          if (traditionalValue) {
            return traditionalValue;
          }
          // 否则返回第一个原始值
          return originalValues[0];
        }
        return processedValue;
      },

      // 获取所有匹配的原始值（包括简体和繁体），用于同时匹配多个值
      getAllOriginalValues(processedValue, valueMap) {
        if (!processedValue || !valueMap) return [processedValue];
        const originalValues = valueMap.get(processedValue);
        if (originalValues && originalValues.length > 0) {
          console.log(`getAllOriginalValues: "${processedValue}" -> [${originalValues.join(', ')}]`);
          return originalValues;
        }
        console.log(`getAllOriginalValues: "${processedValue}" -> not found in map, returning [${processedValue}]`);
        return [processedValue];
      },
      
      async fetchRegions() {
        // 获取所有匹配的county值（包括简体和繁体）
        const allCountyValues = this.selectedCounty ? 
          this.getAllOriginalValues(this.selectedCounty, this.countyValueMap) : [null];
        
        try {
          const allRegionsSet = new Set();
          const allRegionsArray = [];

          // 为每个county值获取regions并合并
          for (const countyValue of allCountyValues) {
            let response;
            if (countyValue) {
              response = await fetch(`https://juseaxerf.com/api/regions/${this.country}/${encodeURIComponent(countyValue)}`, withBackendApiKey());
            } else {
              response = await fetch(`https://juseaxerf.com/api/regions/${this.country}`, withBackendApiKey());
            }
            
            if (response && response.ok) {
              const data = await response.json();
              if (Array.isArray(data)) {
                // 去重并添加到结果中
                for (const region of data) {
                  if (region && !allRegionsSet.has(region)) {
                    allRegionsSet.add(region);
                    allRegionsArray.push(region);
                  }
                }
              }
            }
          }

          // 处理合并后的regions
          const result = this.processOptions(allRegionsArray);
          this.regions = result.processed;
          this.filteredRegions = result.processed;
          this.regionValueMap = result.valueMap;

          // 将 region 映射表保存到 localStorage，供地图页复用合项匹配
          try {
            const mapArray = Array.from(result.valueMap.entries());
            localStorage.setItem('attractionsRegionValueMap', JSON.stringify(mapArray));
          } catch (e) {
            console.error('Failed to save regionValueMap to localStorage:', e);
          }
        } catch (error) {
          console.error('Error fetching regions:', error);
        }
      },

      async fetchCountis() {
        try {
          const response = await fetch(`https://juseaxerf.com/api/countis/${this.country}`, withBackendApiKey());
          const data = await response.json();
          const filtered = data.filter(county => county && county.trim() !== '');
          console.log('Raw counties from API:', filtered);
          const result = this.processOptions(filtered);
          console.log('Processed counties:', result.processed);
          console.log('County value map:', Array.from(result.valueMap.entries()).map(([k, v]) => [k, v]));

          // 基础数据立刻就位，避免阻塞页面加载
          this.countyValueMap = result.valueMap;
          this.countis = result.processed;
          this.filteredCounties = [...result.processed];

          // 保存 countyValueMap 到 localStorage，供其他组件使用
          try {
            const mapArray = Array.from(result.valueMap.entries());
            localStorage.setItem('attractionsCountyValueMap', JSON.stringify(mapArray));
          } catch (e) {
            console.error('Failed to save countyValueMap to localStorage:', e);
          }

          this.countisLoaded = true;

          // 在后台按「结果数 < 28 隐藏」的规则做二次精简，不阻塞主流程
          this.refineCountisByResultCount().catch(() => {});
        } catch (error) {
          console.error('Error fetching regions:', error);
          this.countisLoaded = true;
        }
      },

      // 根据「筛选后的结果数」异步精简 county 选项：小于 28 个结果的选项不展示
      async refineCountisByResultCount() {
        try {
          const cacheKey = `validCountiesCache_${this.country}`;

          // 先尝试从缓存读取
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.countis = parsed;
              this.filteredCounties = [...parsed];
              console.log(`Loaded valid counties for ${this.country} from cache:`, parsed.length);
              return;
            }
          }

          const source = Array.isArray(this.countis) ? [...this.countis] : [];
          const valueMap = this.countyValueMap || new Map();
          const regionValueMap = this.regionValueMap || new Map();
          const validCountis = [];

          for (const processedName of source) {
            if (!processedName) continue;
            try {
              // 合项：一个展示名可能对应多个 API 原始值，total 需用「所有原始值」分别请求后加总
              const allOriginalCounties = this.getAllOriginalValues(processedName, valueMap);
              let totalSum = 0;

              for (const originalCounty of allOriginalCounties) {
                const params = new URLSearchParams();
                const minReviews = Number.isFinite(this.minReviews) ? this.minReviews : 0;
                params.append('minReviews', minReviews);
                params.append('order', this.order || 'rating_desc');
                params.append('page', '1');
                params.append('limit', '28'); // 只取前 28 条，用 total 判断

                // 同时带上当前区域筛选（考虑 region 合项映射）
                if (this.selectedRegion) {
                  const originalRegion = this.getOriginalValue(this.selectedRegion, regionValueMap);
                  if (originalRegion) {
                    params.append('region', originalRegion);
                  }
                }
                if (originalCounty) {
                  params.append('county', originalCounty);
                }
                const res = await fetch(`https://juseaxerf.com/api/attractions/${this.country}?${params.toString()}`, withBackendApiKey());
                if (!res || !res.ok) continue;
                const data = await res.json();
                if (!data || !Array.isArray(data.data)) continue;
                const parsedTotal = Number.parseInt(data.total, 10);
                const total = Number.isFinite(parsedTotal) ? parsedTotal : data.data.length;
                totalSum += total;
              }

              const passed = totalSum >= 28;
              if (passed) {
                validCountis.push(processedName);
              }
            } catch (e) {
              // 单个选项失败时忽略，不影响其它选项
              continue;
            }
          }

          // 如果没有算出任何有效选项，就保持现状，避免把列表清空
          if (!validCountis.length) return;

          this.countis = validCountis;
          this.filteredCounties = [...validCountis];

          // 保存到缓存，按国家区分
          try {
            localStorage.setItem(cacheKey, JSON.stringify(validCountis));
          } catch (e) {
            console.warn(`Failed to save valid counties cache for ${this.country}:`, e);
          }

          // 如果当前选中的 county 不在有效列表中，重置为「所有」
          if (this.selectedCounty && !this.countis.includes(this.selectedCounty)) {
            this.selectedCounty = '';
            try { localStorage.setItem('attractionsCounty', ''); } catch (e) {}
          }
        } catch (e) {
          // 整体精简过程失败时静默忽略，不影响基础功能
        }
      },

      restoreDistanceQueueState() {
        const snapshot = this.readDistanceQueueFromStorage();
        if (!snapshot) {
          this.clearDistanceQueue(true);
          if (this.order === 'distance_near') {
            this.order = 'rating_desc';
          }
          return;
        }
        const filtersMatch = this.distanceQueueMatchesFilters(snapshot);
        this.distanceQueue = snapshot;
        this.distanceSortAvailable = filtersMatch;
        if (!filtersMatch && this.order === 'distance_near') {
          this.clearDistanceQueue(true);
          this.order = 'rating_desc';
          return;
        }
        if (this.order === 'distance_near') {
          try {
            const p = parseInt(localStorage.getItem('attractionsPage'), 10);
            if (Number.isFinite(p) && p > 0) this.page = p;
          } catch (e) {}
          this.total = Array.isArray(snapshot.items) ? snapshot.items.length : (Array.isArray(snapshot.ids) ? snapshot.ids.length : this.total);
        }
      },
      getCurrentFilterSnapshot() {
        const minReviews = Number.isFinite(this.minReviews) ? this.minReviews : 0;
        return {
          minReviews,
          region: this.selectedRegion || '',
          county: this.selectedCounty || '',
        };
      },
      readDistanceQueueFromStorage() {
        try {
          const raw = localStorage.getItem('distanceBrowseQueue');
          if (!raw) return null;
          const obj = JSON.parse(raw);
          if (!obj || String(obj.country || '') !== String(this.country)) return null;
          const hasItems = Array.isArray(obj.items) && obj.items.length > 0;
          const hasIds = Array.isArray(obj.ids) && obj.ids.length > 0;
          if (!hasItems && !hasIds) return null;
          return obj;
        } catch (e) {
          return null;
        }
      },
      distanceQueueMatchesFilters(queue) {
        if (!queue || !queue.filters) return false;
        const cur = this.getCurrentFilterSnapshot();
        return (Number(queue.filters.minReviews) || 0) === (Number(cur.minReviews) || 0)
          && String(queue.filters.region || '') === String(cur.region || '')
          && String(queue.filters.county || '') === String(cur.county || '');
      },
      clearDistanceQueue(removeStorage = false) {
        this.distanceQueue = null;
        this.distanceSortAvailable = false;
        if (removeStorage) {
          try { localStorage.removeItem('distanceBrowseQueue'); } catch (e) {}
        }
      },
      handleDistanceQueueResetOnFilters() {
        const wasDistance = this.order === 'distance_near';
        if (wasDistance || this.distanceQueue) {
          this.clearDistanceQueue(true);
        }
        if (wasDistance) {
          this.order = 'rating_desc';
          return true;
        }
        return false;
      },
      async applyDistanceQueuePage(resetPage = false) {
        const snapshot = this.readDistanceQueueFromStorage();
        if (!snapshot || !this.distanceQueueMatchesFilters(snapshot)) {
          this.clearDistanceQueue(true);
          return false;
        }
        this.distanceSortAvailable = true;
        this.distanceQueue = snapshot;
        if (resetPage) this.page = 1;
        const total = Array.isArray(snapshot.items) ? snapshot.items.length : (Array.isArray(snapshot.ids) ? snapshot.ids.length : 0);
        this.total = total;
        const maxPage = Math.max(1, Math.ceil((total || 1) / this.limit));
        if (!Number.isFinite(this.page) || this.page < 1) this.page = 1;
        if (this.page > maxPage) this.page = maxPage;
        try { localStorage.setItem('attractionsPage', this.page); } catch (e) {}
        const start = (this.page - 1) * this.limit;
        const end = start + this.limit;
        let pageItems = [];
        if (Array.isArray(snapshot.items) && snapshot.items.length) {
          pageItems = snapshot.items.slice(start, end).map(item => ({
            ...item,
            image1: item && item.image1 ? item.image1 : '',
          }));
        } else if (Array.isArray(snapshot.ids) && snapshot.ids.length) {
          const pageIds = snapshot.ids.slice(start, end).filter(Boolean);
          try {
            const rows = await fetchAttractionsPositionsByIds(this.country, pageIds);
            const byId = new Map((Array.isArray(rows) ? rows : []).map(r => [String(r && r.id), r]));
            pageItems = pageIds.map(id => {
              const hit = byId.get(String(id));
              if (hit) {
                return {
                  id: hit.id,
                  name: hit.name || '',
                  region: hit.region || '',
                  county: hit.county || '',
                  rating: hit.rating,
                  total_reviews: hit.total_reviews,
                  positive_reviews: hit.positive_reviews,
                  hasImage: !!hit.hasImage,
                  image1: '',
                };
              }
              return { id, name: '', region: '', county: '', rating: '', total_reviews: '', positive_reviews: '', hasImage: false, image1: '' };
            });
          } catch (e) {
            pageItems = pageIds.map(id => ({ id, name: '', region: '', county: '', rating: '', total_reviews: '', positive_reviews: '', hasImage: false, image1: '' }));
          }
        }
        this.attractions = pageItems;
        this.loading = false;
        this.prefetchDistanceQueueImages(pageItems);
        this.bumpListRenderTick();
        return true;
      },
      prefetchDistanceQueueImages(items) {
        items.forEach(async (a, i) => {
          try {
            if (a && a.hasImage && !a.image1) {
              const res = await fetch(`https://juseaxerf.com/api/attraction-image/${this.country}/${a.id}/1`, withBackendApiKey());
              if (res && res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                if (this.attractions && this.attractions[i]) {
                  this.attractions[i].image1 = url;
                }
              }
            }
          } catch (e) {}
        });
      },
      bumpListRenderTick() {
        this.listRenderTick = (this.listRenderTick + 1) % 1000000;
      },
      waitForRetry(delay) {
        return new Promise(resolve => setTimeout(resolve, delay));
      },

      async fetchAttractions(isregion) {
        const fetchToken = ++this.activeFetchToken;
        this.loading = true;
        if (this.order === 'distance_near') {
          const applied = await this.applyDistanceQueuePage(!!isregion);
          if (!applied) {
            this.loading = false;
            this.order = 'rating_desc';
          }
          return;
        }
        
        // 获取所有匹配的county值（包括简体和繁体）
        let allCountyValues = this.selectedCounty ? 
          this.getAllOriginalValues(this.selectedCounty, this.countyValueMap) : [null];
        let allRegionValues = this.selectedRegion ? 
          this.getAllOriginalValues(this.selectedRegion, this.regionValueMap) : [null];

        // 调试信息：打印所有匹配的值
        if (this.selectedCounty) {
          console.log('Selected county:', this.selectedCounty);
          console.log('All county values:', allCountyValues);
          console.log('County value map size:', this.countyValueMap.size);
          // 检查当前选中的county在valueMap中是否有多个原始值
          if (this.countyValueMap.has(this.selectedCounty)) {
            const mappedValues = this.countyValueMap.get(this.selectedCounty);
            console.log(`County "${this.selectedCounty}" mapped to:`, mappedValues);
            if (mappedValues && mappedValues.length > 1) {
              console.log(`Found ${mappedValues.length} original values for "${this.selectedCounty}"`);
              // 确保 allCountyValues 包含所有原始值
              allCountyValues = [...mappedValues];
            }
          }
        }
        if (this.selectedRegion) {
          console.log('Selected region:', this.selectedRegion);
          console.log('All region values:', allRegionValues);
          // 检查当前选中的region在valueMap中是否有多个原始值
          if (this.regionValueMap.has(this.selectedRegion)) {
            const mappedValues = this.regionValueMap.get(this.selectedRegion);
            console.log(`Region "${this.selectedRegion}" mapped to:`, mappedValues);
            if (mappedValues && mappedValues.length > 1) {
              console.log(`Found ${mappedValues.length} original values for "${this.selectedRegion}"`);
              // 确保 allRegionValues 包含所有原始值
              allRegionValues = [...mappedValues];
            }
          }
        }

        // 如果只有一个值，使用原来的逻辑；如果有多个值，需要合并多个请求的结果
        const needMultipleRequests = allCountyValues.length > 1 || allRegionValues.length > 1;
        
        if (needMultipleRequests) {
          console.log('Using multi-request mode. County values:', allCountyValues, 'Region values:', allRegionValues);
        }
        
        if (!needMultipleRequests) {
          // 单个请求的情况（保持原有逻辑）
          const params = new URLSearchParams();
          const minReviews = Number.isFinite(this.minReviews) ? this.minReviews : 0;
          params.append('minReviews', minReviews);
          params.append('order', this.order);
          params.append('page', isregion ? 1 : this.page);
          params.append('limit', this.limit);
          if (this.selectedRegion) {
            const originalRegion = this.getOriginalValue(this.selectedRegion, this.regionValueMap);
            params.append('region', originalRegion);
          }
          if (this.selectedCounty) {
            const originalCounty = this.getOriginalValue(this.selectedCounty, this.countyValueMap);
            params.append('county', originalCounty);
          }
          if (this.order === 'rating_desc') params.append('secondary', 'reviews_desc');

          let attempts = 0;
          while (this.activeFetchToken === fetchToken && attempts < this.maxFetchRetries) {
            try {
              const response = await fetch(`https://juseaxerf.com/api/attractions/${this.country}?${params.toString()}`, withBackendApiKey());
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              if (this.activeFetchToken !== fetchToken) return;

              if (!data || !Array.isArray(data.data)) {
                throw new Error('Invalid attractions payload');
              }

              const parsedTotal = Number.parseInt(data.total, 10);
              const total = Number.isFinite(parsedTotal) ? parsedTotal : data.data.length;
              this.total = total;
              
              // 对于单请求情况，由于API支持分页，我们无法获取所有数据
              // 所以只保存当前页的ID，详情页面需要通过API获取其他页的数据
              // 清除之前保存的所有ID列表（如果存在）
              try {
                localStorage.removeItem('allAttractionIds');
                localStorage.removeItem('allAttractionIdsPage');
                localStorage.removeItem('allAttractionIdsTotal');
              } catch (e) {}
              
              this.attractions = data.data.map(a => ({
                ...a,
                image1: '',
              }));
              this.loading = false;

              this.attractions.forEach(async (a, i) => {
                if (a.hasImage) {
                  try {
                    const res = await fetch(`https://juseaxerf.com/api/attraction-image/${this.country}/${a.id}/1`, withBackendApiKey());
                    if (res && res.ok) {
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      this.attractions[i].image1 = url;
                    }
                  } catch (e) {}
                }
              });

              if (this.order === 'rating_desc') {
                const parsePercent = (v) => {
                  if (v == null) return 0;
                  const s = String(v).replace('%', '');
                  const n = parseFloat(s);
                  return Number.isFinite(n) ? n : 0;
                };
                this.attractions = [...this.attractions].sort((a, b) => {
                  const ra = parsePercent(a.rating);
                  const rb = parsePercent(b.rating);
                  if (rb !== ra) return rb - ra;
                  const ta = Number(a.total_reviews) || 0;
                  const tb = Number(b.total_reviews) || 0;
                  return tb - ta;
                });
                
                // 在单请求模式下，如果是按好评率最高排序，需要获取所有数据来计算第一个不是100%的景点在哪一页
                // 异步获取所有数据来计算正确的页码
                this.calculateFirstNon100PageForSingleRequest(fetchToken);
              }
              this.bumpListRenderTick();
              return;
            } catch (error) {
              attempts++;
              if (attempts >= this.maxFetchRetries) {
                console.error('Failed to fetch attractions after retries:', error);
                this.loading = false;
                return;
              }
              await this.waitForRetry(this.fetchRetryDelay);
            }
          }
        } else {
          // 多个请求的情况：需要合并简体和繁体的结果
          const allResults = [];
          let totalCount = 0;
          const seenIds = new Set(); // 用于去重

          // 为每个county值发送请求
          for (const countyValue of allCountyValues) {
            // 为每个region值发送请求（如果有region筛选）
            for (const regionValue of allRegionValues) {
              // 分页获取所有数据
              let page = 1;
              let hasMoreData = true;
              const maxLimit = 10000; // API可能的最大limit
              let currentCombinationFetched = 0; // 当前county/region组合已获取的数据量（去重前）
              
              while (hasMoreData && this.activeFetchToken === fetchToken) {
                const params = new URLSearchParams();
                const minReviews = Number.isFinite(this.minReviews) ? this.minReviews : 0;
                params.append('minReviews', minReviews);
                params.append('order', this.order);
                params.append('page', page);
                params.append('limit', maxLimit);
                if (regionValue) {
                  params.append('region', regionValue);
                }
                if (countyValue) {
                  params.append('county', countyValue);
                }
                if (this.order === 'rating_desc') params.append('secondary', 'reviews_desc');

                let attempts = 0;
                let success = false;
                while (this.activeFetchToken === fetchToken && attempts < this.maxFetchRetries) {
                  try {
                    const response = await fetch(`https://juseaxerf.com/api/attractions/${this.country}?${params.toString()}`, withBackendApiKey());
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    if (this.activeFetchToken !== fetchToken) return;

                    if (data && Array.isArray(data.data)) {
                      const returnedCount = data.data.length;
                      const parsedTotal = Number.parseInt(data.total, 10);
                      
                      // 去重并添加到结果中
                      for (const item of data.data) {
                        if (!seenIds.has(String(item.id))) {
                          seenIds.add(String(item.id));
                          allResults.push(item);
                        }
                      }
                      
                      // 更新当前组合已获取的数据量（使用返回的原始数据量，不去重）
                      currentCombinationFetched += returnedCount;
                      
                      // 检查是否还有更多数据
                      if (returnedCount < maxLimit) {
                        // 返回的数据量小于limit，说明已经是最后一页
                        hasMoreData = false;
                      } else if (Number.isFinite(parsedTotal)) {
                        // 如果已获取的数据量达到或超过total，说明已经获取了所有数据
                        if (currentCombinationFetched >= parsedTotal) {
                          hasMoreData = false;
                        } else {
                          // 继续获取下一页
                          page++;
                        }
                      } else {
                        // 如果没有total信息，根据返回的数据量判断
                        // 如果返回的数据量等于limit，可能还有更多页
                        if (returnedCount >= maxLimit) {
                          page++;
                        } else {
                          hasMoreData = false;
                        }
                      }
                    } else {
                      hasMoreData = false;
                    }
                    success = true;
                    break; // 成功，跳出重试循环
                  } catch (error) {
                    attempts++;
                    if (attempts >= this.maxFetchRetries) {
                      console.error(`Failed to fetch attractions for county=${countyValue}, region=${regionValue}, page=${page}:`, error);
                      hasMoreData = false; // 失败后不再继续
                      break;
                    }
                    await this.waitForRetry(this.fetchRetryDelay);
                  }
                }
                
                if (!success) {
                  hasMoreData = false; // 如果请求失败，停止获取
                }
              }
            }
          }

          // 合并结果并按排序规则排序
          if (this.order === 'rating_desc') {
            const parsePercent = (v) => {
              if (v == null) return 0;
              const s = String(v).replace('%', '');
              const n = parseFloat(s);
              return Number.isFinite(n) ? n : 0;
            };
            allResults.sort((a, b) => {
              const ratingA = parsePercent(a.rating);
              const ratingB = parsePercent(b.rating);
              if (ratingA !== ratingB) return ratingB - ratingA;
              const reviewsA = parseInt(a.total_reviews || 0, 10);
              const reviewsB = parseInt(b.total_reviews || 0, 10);
              return reviewsB - reviewsA;
            });
            
            // 找到第一个好评率不是100%的景点，并计算其所在页码
            let foundNon100Page = null;
            for (let i = 0; i < allResults.length; i++) {
              const rating = parsePercent(allResults[i].rating);
              if (rating !== 100) {
                foundNon100Page = Math.floor(i / this.limit) + 1;
                break;
              }
            }
            // 如果找到第一个不是100%的景点，设置gotoPage为该页码；否则设置为第1页
            this.gotoPage = foundNon100Page !== null ? foundNon100Page : 1;
          } else if (this.order === 'rating_asc') {
            const parsePercent = (v) => {
              if (v == null) return 0;
              const s = String(v).replace('%', '');
              const n = parseFloat(s);
              return Number.isFinite(n) ? n : 0;
            };
            allResults.sort((a, b) => {
              const ratingA = parsePercent(a.rating);
              const ratingB = parsePercent(b.rating);
              return ratingA - ratingB;
            });
          } else if (this.order === 'reviews_desc') {
            allResults.sort((a, b) => {
              const reviewsA = parseInt(a.total_reviews || 0, 10);
              const reviewsB = parseInt(b.total_reviews || 0, 10);
              return reviewsB - reviewsA;
            });
          } else if (this.order === 'reviews_asc') {
            allResults.sort((a, b) => {
              const reviewsA = parseInt(a.total_reviews || 0, 10);
              const reviewsB = parseInt(b.total_reviews || 0, 10);
              return reviewsA - reviewsB;
            });
          } else if (this.order === 'positive_desc') {
            allResults.sort((a, b) => {
              const positiveA = parseInt(a.positive_reviews || 0, 10);
              const positiveB = parseInt(b.positive_reviews || 0, 10);
              return positiveB - positiveA;
            });
          } else if (this.order === 'positive_asc') {
            allResults.sort((a, b) => {
              const positiveA = parseInt(a.positive_reviews || 0, 10);
              const positiveB = parseInt(b.positive_reviews || 0, 10);
              return positiveA - positiveB;
            });
          }

          // 分页处理
          const startIndex = (this.page - 1) * this.limit;
          const endIndex = startIndex + this.limit;
          const paginatedResults = allResults.slice(startIndex, endIndex);

          // 使用实际合并后的数据长度作为总数（已去重）
          // 这样可以正确显示合并后的总页数
          this.total = allResults.length;
          
          // 保存所有合并后的景点ID（用于详情页面的跨页导航）
          // 这样详情页面可以知道所有页面的景点顺序
          try {
            const allIds = allResults.map(item => item.id);
            localStorage.setItem('allAttractionIds', JSON.stringify(allIds));
            localStorage.setItem('allAttractionIdsPage', String(this.page));
            localStorage.setItem('allAttractionIdsTotal', String(allResults.length));
          } catch (e) {
            console.error('Failed to save all attraction IDs:', e);
          }
          
          this.attractions = paginatedResults.map(a => ({
            ...a,
            image1: '',
          }));
          this.loading = false;

          this.attractions.forEach(async (a, i) => {
            if (a.hasImage) {
              try {
                const res = await fetch(`https://juseaxerf.com/api/attraction-image/${this.country}/${a.id}/1`, withBackendApiKey());
                if (res && res.ok) {
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  this.attractions[i].image1 = url;
                }
              } catch (e) {}
            }
          });

          this.bumpListRenderTick();
        }
      },

      async calculateFirstNon100PageForSingleRequest(fetchToken) {
        // 在单请求模式下，获取所有数据来计算第一个不是100%的景点在哪一页
        try {
          const params = new URLSearchParams();
          const minReviews = Number.isFinite(this.minReviews) ? this.minReviews : 0;
          params.append('minReviews', minReviews);
          params.append('order', this.order);
          params.append('page', 1);
          params.append('limit', 10000); // 使用一个很大的limit来获取所有数据
          if (this.selectedRegion) {
            const originalRegion = this.getOriginalValue(this.selectedRegion, this.regionValueMap);
            params.append('region', originalRegion);
          }
          if (this.selectedCounty) {
            const originalCounty = this.getOriginalValue(this.selectedCounty, this.countyValueMap);
            params.append('county', originalCounty);
          }
          if (this.order === 'rating_desc') params.append('secondary', 'reviews_desc');

          const response = await fetch(`https://juseaxerf.com/api/attractions/${this.country}?${params.toString()}`, withBackendApiKey());
          if (!response.ok) return;
          const data = await response.json();
          if (this.activeFetchToken !== fetchToken) return;

          if (!data || !Array.isArray(data.data)) return;

          const parsePercent = (v) => {
            if (v == null) return 0;
            const s = String(v).replace('%', '');
            const n = parseFloat(s);
            return Number.isFinite(n) ? n : 0;
          };

          // 排序数据
          const sortedData = [...data.data].sort((a, b) => {
            const ra = parsePercent(a.rating);
            const rb = parsePercent(b.rating);
            if (rb !== ra) return rb - ra;
            const ta = Number(a.total_reviews) || 0;
            const tb = Number(b.total_reviews) || 0;
            return tb - ta;
          });

          // 找到第一个好评率不是100%的景点，并计算其所在页码
          for (let i = 0; i < sortedData.length; i++) {
            const rating = parsePercent(sortedData[i].rating);
            if (rating !== 100) {
              const targetPage = Math.floor(i / this.limit) + 1;
              this.gotoPage = targetPage;
              return;
            }
          }
          // 如果所有景点都是100%好评率，则设置为第1页
          this.gotoPage = 1;
        } catch (error) {
          console.error('Failed to calculate first non-100% page:', error);
          // 如果出错，设置为当前页作为后备方案
          if (this.gotoPage === null || this.gotoPage === undefined) {
            this.gotoPage = this.page;
          }
        }
      },

      goBack() {
        localStorage.setItem('attractionsPage', 1); // 保存当前页数到localStorage
        localStorage.setItem('attractionMinReviews',0);
        localStorage.setItem('attractionsRegion', '');
        localStorage.setItem('attractionsOrder',"rating_desc");
        localStorage.setItem('attractionsCounty','');
        localStorage.setItem('attractionsCounty','');
        try { localStorage.removeItem('distanceBrowseQueue'); } catch (e) {}
        // 返回到国家选择页（首页路径为 '/'）
        this.$router.push('/');
      },

      nextPage() {
      this.resetSwipeState(true);
      if (this.page < this.totalPages) {
        this.page++;
        localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
        localStorage.setItem('attractionMinReviews',this.minReviews);
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        localStorage.setItem('attractionsOrder',this.order)
        this.fetchAttractions(false);
      }
    },

      prevPage() {
        this.resetSwipeState(true);
        if (this.page > 1) {
          this.page--;
          localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
          localStorage.setItem('attractionMinReviews',this.minReviews);
          localStorage.setItem('attractionsRegion', this.selectedRegion);
          localStorage.setItem('attractionsOrder',this.order)
          this.fetchAttractions(false);
        }
      },

      validateInput() {
        if (!Number.isInteger(this.gotoPage) || this.gotoPage < 1) {
          this.gotoPage = 1;
        } else if (this.gotoPage > this.totalPages) {
          this.gotoPage = this.totalPages;
        }
        
        if (this.gotoPage && this.gotoPage !== this.page) {
          this.page = this.gotoPage;
          localStorage.setItem('attractionsPage', this.page);
          this.fetchAttractions(false);
        }
      },

      validateInputmin() {
          if (!Number.isInteger(this.minReviews) || this.minReviews < 0) {
              this.minReviews = 0;
          }
          const resetByDistance = this.handleDistanceQueueResetOnFilters();
          this.page = 1;
          localStorage.setItem('attractionsPage', this.page);
          localStorage.setItem('attractionMinReviews', this.minReviews);
          try { invalidateAttractionMapCache('filters:minReviews'); } catch (e) {}
          if (!resetByDistance) {
            this.fetchAttractions(false);
          }
      },

      filterCounties() {
        if (this.countySearch.trim() === '') {
          this.filteredCounties = this.countis.filter(county =>
            this.countySearch.trim() ? county.toLowerCase().includes(this.countySearch.toLowerCase()) : false
          );
        } else {
          this.filteredCounties = this.countis.filter(county => 
            county.toLowerCase().includes(this.countySearch.toLowerCase())
          );
        }
      },

      filterRegions() {
        if (this.regionSearch.trim() === '') {
          this.filteredRegions = this.regions.filter(region =>
            this.regionSearch.trim() ? region.toLowerCase().includes(this.regionSearch.toLowerCase()) : false
          );
        } else {
          this.filteredRegions = this.regions.filter(region => 
            region.toLowerCase().includes(this.regionSearch.toLowerCase())
          );
        }
      },

      getRatingColor(rating) {
        // 兼容 "95"、"95%"、数字类型、空值等，且限制在 0-100
        const raw = typeof rating === 'number' ? rating : parseFloat(String(rating || '').replace('%', '').trim());
        const ratingValue = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
        // 50% 及以下为纯红
        if (ratingValue <= 50) {
          return '#ff3b30';
        }
        // 100% 为纯绿
        if (ratingValue >= 100) {
          return '#34c759';
        }
        // 50% - 100%：红色以 10 倍速度衰减，绿色 1 倍增加
        const x = (ratingValue - 50) / 50;
        const red = Math.round(255 * Math.max(0, 1 - 10 * x));
        const green = Math.round(255 * x);
        return `rgb(${red}, ${green}, 0)`;
      },

      selectCounty(county) {
        this.selectedCounty = county;
        this.countySearch = county;
        this.showCountySuggestions = false;
        this.applyFilters();
      },

      selectRegion(region) {
        this.selectedRegion = region;
        this.regionSearch = region;
        this.showRegionSuggestions = false;
        this.applyFilters();
      },

      hideCountySuggestions() {
        setTimeout(() => {
          this.showCountySuggestions = false;
        }, 200);
      },

      hideRegionSuggestions() {
        setTimeout(() => {
          this.showRegionSuggestions = false;
        }, 200);
      },

      updateCountyDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.countyInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.countyDropdownStyle = {
              top: `${rect.bottom}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`
            };
          }
        });
      },

      updateRegionDropdownPosition() {
        this.$nextTick(() => {
          const input = this.$refs.regionInput;
          if (input) {
            const rect = input.getBoundingClientRect();
            this.regionDropdownStyle = {
              top: `${rect.bottom}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`
            };
          }
        });
    }
  }
};
</script>


<style scoped>

/* 让景点名和位置在同一行显示 */
.attraction-header-mobile {
  display: flex;
  align-items: center;
  flex-wrap: wrap; /* 如果太长就换行 */
  justify-content: space-between; /* 让右边的位置信息贴边 */
  gap: 0; /* 名称和位置之间的间距 */
}

.attraction-header-mobile .attraction-name {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 0;
    white-space: wrap;
  vertical-align: middle;  /* 对齐 */
}

.attraction-header-mobile .attraction-location {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: #666;
  white-space: nowrap; /* 避免位置换行 */
}

.attraction-header-mobile .location-icon {
  margin-right: 2px;
}

.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(120deg, #f0f0f0, #e0e0e0, #f0f0f0);
  background-size: 200% 100%;
  animation: placeholderShimmer 1.6s infinite linear;
  border-radius: 12px;
}

@keyframes placeholderShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.fade-in-image {
  opacity: 1;
  transform: scale(1);
  filter: blur(0);
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh; /* 页面占满视口高度 */
  overflow: hidden; /* 防止整个页面滚动 */
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* 固定顶部区域（标题+筛选器） */
.fixed-header {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 10px 20px 0; /* 原 20px 的一半 */
}

/* 收藏按钮 */
.filters-toolbar {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 8px;
  margin-bottom: 6px;
}
.favorites-button {
  position: static;
  padding: 8px 12px;
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
  color: #5a4100;
  border: none;
  border-radius: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 183, 0, 0.35);
}

/* 收藏菜单 */
.favorites-menu {
  position: fixed;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.2);
  padding: 12px;
  /* 只让内部列表滚动，外层不产生多余空白 */
  overflow: visible;
  user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -moz-user-select: none;
  -webkit-touch-callout: none; /* 禁止长按弹出菜单（iOS Safari） */
}
/* 自创景点 + 项样式 */
.favorites-add { display: flex; justify-content: center; align-items: center; padding: 2px 0; cursor: pointer; }
.favorites-add .plus-circle { width: 30px; height: 30px; border-radius: 50%; background: #f3f6fb; color: #334155; font-size: 20px; font-weight: 700; line-height: 30px; text-align: center; transition: transform .1s ease, background .2s ease; }
.favorites-add .plus-circle:hover { background: #e6ebf5; transform: scale(1.04); }
.favorites-actions-row { display: flex; gap: 10px; margin-top: 10px; }
.favorites-action-btn { flex: 1 1 0; padding: 8px 10px; border-radius: 10px; border: 1px solid #d8dee9; background: #f8fafc; color: #334155; font-weight: 700; cursor: pointer; }
.favorites-action-btn.primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.favorites-action-btn:hover { filter: brightness(0.98); }
.hidden-file-input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
.favorites-backdrop {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 999;
}
.favorites-menu h4 {
  margin: 0 0 8px;
}
.fav-tabs-wrap { margin: 0 0 8px; overflow: hidden; }
.fav-tabs {
  display: flex; /* block-level for reliable scroll */
  width: 100%;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden; /* avoid vertical squeezing when the scrollbar shows */
  padding: 4px 0 8px; /* reserve room for horizontal scrollbar without clipping content */
  scrollbar-gutter: stable;
  -ms-overflow-style: none; /* IE/Edge */
  scrollbar-width: none; /* Firefox */
}
.fav-tabs.draggingTabs {
  /* Disable touch panning while dragging tabs to avoid native scroll */
  touch-action: none;
  overflow-x: hidden;
  overscroll-behavior: contain;
}
.fav-tabs::-webkit-scrollbar { display: none; }
.fav-tab {
  flex: 0 0 auto;
  font-weight: 300;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  color: #1d1d1f;
}
.fav-tab.active { font-weight: 700; }
.tab-editable {
  outline: none;
  border: none;
  display: inline-block;
  min-width: 2em;
  user-select: text;
  -webkit-user-select: text;
  -ms-user-select: text;
  -moz-user-select: text;
  caret-color: #1d1d1f;
}
.tab-plus {
  width: 22px;
  height: 22px;
  min-width: 22px;
  min-height: 22px;
  border-radius: 50%;
  background: #f1f3f5;
  color: #333;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  aspect-ratio: 1;
  line-height: 1;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
}
.tab-plus:hover { background: #e9ecef; }
.tab-placeholder {
  display: inline-block;
  height: 1.2em;
  border: 2px dashed #ffcd00; /* 黄色虚线框 */
  background: transparent;    /* 不要填充色 */
  border-radius: 4px;
  flex: 0 0 auto; /* 避免被压缩到0宽 */
}
.tab-ghost {
  pointer-events: none;
  color: #1d1d1f;
  font-weight: 700;
  z-index: 1001;
  background: #fff; /* 白色底 */
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap; /* 不换行 */
  box-sizing: border-box; /* 宽度包含内边距 */
  display: inline-block;
}

/* Confirm dialog styles */
.confirm-backdrop {
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 1100;
}
.confirm-dialog {
  position: fixed;
  left: 50%; top: 50%; transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 12px;
  padding: 16px 18px;
  min-width: 260px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.2);
  z-index: 1101;
}
.confirm-message {
  margin-bottom: 12px;
  font-size: 14px;
  color: #1d1d1f;
}
.export-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}
.export-progress-text {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.export-progress-count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #065f46;
  flex-shrink: 0;
  white-space: nowrap;
}
.export-progress-bar {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 9999px;
  background: #e5e7eb;
  overflow: hidden;
}
.export-progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: #16a34a; /* 绿色进度部分 */
  transition: width 0.2s ease-out;
}
.confirm-message .danger-word {
  color: #c0392b; /* 红色 */
  font-weight: 800; /* 加粗 */
  font-size: 1.2em; /* 加大字号 */
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn-cancel {
  background: #27ae60; /* 绿色 */
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-weight: 700;
  cursor: pointer;
}
.btn-danger {
  background: #c0392b;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-weight: 700;
  cursor: pointer;
}
.favorites-menu .favorites-list { counter-reset: fav; }
.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -moz-user-select: none;
  -webkit-touch-callout: none;
}
.favorites-clear {
  margin-top: 0;
  padding: 10px 12px;
  border: 1px solid rgba(255, 0, 0, 0.15);
  border-radius: 10px;
  color: #c0392b;
  text-align: center;
  font-weight: 700;
  background: rgba(255, 0, 0, 0.06);
  cursor: pointer;
  user-select: none;
}
.favorites-clear[aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}
.favorites-clear:not([aria-disabled="true"]):hover {
  background: rgba(255, 0, 0, 0.1);
}
.favorites-item {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 左侧（序号+图片+文本）靠左，评分在最右 */
  gap: 12px;
  min-height: 56px; /* 恢复较高的行高，提升可触性 */
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.06);
  background: rgba(250,250,250,0.95);
  user-select: none;
  position: relative; /* 用于放置右侧动作按钮 */
  overflow: hidden;    /* 隐藏右移时超出的内容 */
}
.favorites-item .fav-index {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f1f3f5;
  color: #333;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.favorites-item .fav-thumb-wrap {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
}
.favorites-item .fav-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.favorites-item .thumb-placeholder {
  width: 100%;
  height: 100%;
  background: #e9ecef;
}
.favorites-item .fav-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* 文本块靠左对齐 */
  flex: 1;               /* 占据剩余空间用于省略号 */
  min-width: 0;          /* 允许子元素正确计算省略号 */
}
.favorites-item .fav-name {
  font-weight: 700;
  display: block;
  white-space: nowrap;       /* 不换行 */
  overflow: hidden;          /* 超出隐藏 */
  text-overflow: ellipsis;   /* 超出显示省略号 */
  max-width: 100%;
}
.favorites-item .fav-meta {
  font-size: 12px;
  color: #666;
}
.favorites-item .fav-rating {
  color: #fff;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
}
.favorites-item.dragging-shadow {
  box-shadow: 0 10px 24px rgba(0,0,0,0.2);
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
    background: #fff7d6;
    box-shadow: 0 6px 16px rgba(255, 215, 0, 0.25);
  }
  100% {
    background: rgba(250,250,250,0.95);
    box-shadow: 0 0 0 rgba(0,0,0,0);
  }
}
.favorites-placeholder {
  min-height: 56px; /* 与 .favorites-item 行高一致 */
  padding: 8px 10px; /* 与 .favorites-item 一致的内边距，便于匹配视觉高度 */
  border: 2px dashed #ffd700;
  border-radius: 10px;
  transform: none !important;
  transition: none !important;
}
.fav-left-actions {
  position: absolute;
  top: 50%;
  left: 8px;
  transform: translateY(-50%);
  width: 56px; /* 与最大展开一致 */
  display: flex;
  justify-content: flex-start;
  z-index: 1;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.fav-right-actions {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 56px;
  display: flex;
  justify-content: flex-end;
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
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid rgba(107,114,128,0.35);
  background: rgba(107,114,128,0.12);
  color: #374151;
  font-weight: 700;
  font-size: 12px;
}
.fav-pending.active {
  border: 1px solid rgba(59,130,246,0.35);
  background: rgba(59,130,246,0.12);
  color: #1d4ed8;
}
.favorites-item.pending .fav-content {
  filter: grayscale(100%);
  opacity: 0.6;
}
.favorites-item.pending .fav-thumb {
  filter: grayscale(100%);
}

.fav-left-actions.visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 0.18s ease; /* 仅淡入，去除淡出动画 */
}
.fav-delete {
  padding: 4px 8px; /* 稍小 */
  border-radius: 8px;
  border: 1px solid rgba(255,0,0,0.25);
  background: rgba(255,0,0,0.10);
  color: #c0392b;
  font-weight: 700;
  font-size: 12px;
}
.fav-delete:active { transform: scale(0.98); }
.fav-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  will-change: transform;
  transition: transform 0.15s ease;
  position: relative;
  z-index: 2; /* 内容在上方，未右滑时遮住左侧按钮 */
}
.export-area-wrap { margin: 8px 0 10px; }
.export-textarea { width: 68vw; max-width: 720px; height: 220px; max-height: 50vh; border: 1px solid #e5e9f2; border-radius: 8px; padding: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; color: #111827; box-sizing: border-box; }
.btn-primary { background: #3b82f6; color: #fff; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
.btn-primary:hover { filter: brightness(0.96); }

/* Confirm dialog close button (top-right X) */
.confirm-dialog.has-close { position: fixed; padding-right: 48px; }
.confirm-close {
  position: absolute;
  top: 4px;
  right: 6px;
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
}
.confirm-close:hover { color: #111827; }

/* 过渡动画：列表项位置变化时平滑移动，避免“跳动” */
/* 移除过渡动画（恢复原生位置变化） */

/* 收藏态卡片效果 */
.attraction-item.favorited {
  background: linear-gradient(180deg, rgba(255,215,0,0.45), rgba(255,215,0,0.25));
  border: 2px solid rgba(255, 215, 0, 0.95);
  transform: translateY(-10px) scale(1.12);
  box-shadow:
    0 26px 60px rgba(0,0,0,0.28),
    0 0 0 5px rgba(255,215,0,0.55), /* 外环，增强金色边缘存在感 */
    0 0 0 6px rgba(255,215,0,0.28) inset; /* 内环，增加层次 */
  z-index: 6;
}

/* 滚动内容部分 */
.scroll-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-top: 10px;
  padding-bottom: 8px;
}

/* 页面头部 */
.page-header {
  margin-bottom: 10px;
  position: relative;
}

.header-content {
  text-align: center;
}

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
  margin-bottom: 40px;
  clip-path: polygon(20px 0, 100% 0, 100% 100%, 20px 100%, 0 50%);
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

.bottom-back-button {
  margin-bottom: 0;
}

.back-icon {
  font-size: 18px;
  font-weight: bold;
}

.page-title {
  font-size: 3rem;
  font-weight: 500;
  margin-bottom: 0;
}

.title-english {
  font-size: 1.2rem;
  font-weight: 400;
  margin-bottom: 0;
  align-self:center;
}

.title-text-group {
  display: flex;
  align-items:center;
  flex-direction:column;
  justify-content: center;  /* 水平方向居中 */
  line-height: 1.1;
}

.page-subtitle {
  margin-top: 10px;
  font-size: 0.9rem;
  color: #6e6e73;
  font-weight: 400;
}

/* 加载状态 */
.loading-container {
  text-align: center;
  padding: 80px 20px;
}

.loading-text {
  margin-top: 20px;
  color: #6e6e73;
  font-size: 1.1rem;
}

/* 过滤器部分 */
.filters-section {
  margin: 0 auto; /* 居中并保留下边距 */
  padding: 32px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  max-width: 1000px; 
  position: relative; /* 以便右上角收藏按钮绝对定位 */
}
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  align-items: stretch; /* 让同一行的项目（含按钮容器）等高 */
}

.button-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  align-items: stretch; /* 两个按钮等高，拉伸填满单元格高度 */
}
.button-pair > button { width: 100%; min-width: 0; }

.map-button {
  padding: 10px 12px;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.35);
  cursor: pointer;
}
.favorites-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.map-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 强制桌面/移动端仅显示一种文案，避免同时出现 */
@media (min-width: 769px) {
  .label-desktop { display: inline !important; }
  .label-mobile { display: none !important; }
}
@media (max-width: 768px) {
  .label-desktop { display: none !important; }
  .label-mobile { display: inline !important; }
}

/* 桌面：按钮高度与输入框一致（对齐 .filter-group input/select 的视觉高度） */
.filters-section .button-pair .map-button,
.filters-section .button-pair .favorites-button {
  padding: 12px 12px;  /* 与输入框同等的垂直内边距，提高高度一致性 */
  font-size: 12px;     /* 更小字体，保证“收藏列表（数字）”可显示 */
  border-radius: 8px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-weight: 600;
  color: #1d1d1f;
  font-size: 0.9rem;
}

.filter-group input,
.filter-group select {
  padding: 8px 10px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  background: white;
  font-size: 15px;
}

.filter-group input:focus,
.filter-group select:focus {
  border-color: #007aff;
  outline: none;
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #d2d2d7;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: #007aff;
  outline: none;
}

.search-container {
  position: relative;
}

.suggestions-dropdown {
  position: fixed;
  background: white;
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  padding: 8px 6px;
  max-height: none;
  overflow: visible;
  z-index: 2147483647;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  min-width: 200px;
}

.suggestion-item {
  padding: 10px 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.suggestion-item:hover {
  background-color: #f8f9fa;
}

.suggestion-item:last-child {
  border-bottom: none;
}

/* 景点网格 */
.attractions-section {
  margin-bottom: 15px;
  margin-top: 10px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #6e6e73;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 24px;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin-bottom: 8px;
  color: #1d1d1f;
}

.attractions-list-desktop {
  align-items:center;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 16px;
  max-width: 2000px;
  margin: 0 auto;
}

.attraction-item {
  display: flex;
  align-items: center;
  gap: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -moz-user-select: none;
  -webkit-touch-callout: none; /* iOS Safari 禁止长按菜单 */
}

.attraction-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 1);
}

/* 收藏后，悬浮/聚焦/按下与静止状态保持一致的金色样式 */
.attraction-item.favorited:hover,
.attraction-item.favorited:focus,
.attraction-item.favorited:active {
  background: linear-gradient(180deg, rgba(255,215,0,0.45), rgba(255,215,0,0.25));
  border: 2px solid rgba(255, 215, 0, 0.95);
  transform: translateY(-10px) scale(1.12);
  box-shadow:
    0 26px 60px rgba(0,0,0,0.28),
    0 0 0 5px rgba(255,215,0,0.55),
    0 0 0 6px rgba(255,215,0,0.28) inset;
}

/* 待定收藏在列表中的“银色”高亮（覆盖金色样式） */
.attraction-item.favorited.pending,
.attraction-item.favorited.pending:hover,
.attraction-item.favorited.pending:focus,
.attraction-item.favorited.pending:active {
  background: linear-gradient(180deg, rgba(192,192,192,0.45), rgba(192,192,192,0.25));
  border: 2px solid rgba(192, 192, 192, 0.95);
  transform: translateY(-10px) scale(1.12);
  box-shadow:
    0 26px 60px rgba(0,0,0,0.28),
    0 0 0 5px rgba(192,192,192,0.55),
    0 0 0 6px rgba(192,192,192,0.28) inset;
}

.attraction-image-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
}

.attraction-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 初始即设置 transform，确保从 scale(1) 平滑过渡到放大 */
  transform: scale(1);
  transform-origin: center center;
  transition: transform 0.28s ease;
  will-change: transform;
}

.attraction-item:hover .attraction-image {
  transform: scale(1.05);
}

/* 焦点态：与 hover 一致，且带平滑过渡 */
.attraction-item:focus .attraction-image {
  transform: scale(1.05);
}

.rating-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(135deg, #007aff 0%, #0056cc 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.8rem;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.rating-text {
  font-size: 0.8rem;
}

.attraction-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attraction-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attraction-name {
  margin: 0;
}

.attraction-name-text {
    color: #1d1d1f;
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.4;
}

  /* 景点卡片标题使用装饰性字体 */
  .attraction-name,
  .attraction-name-text {
    /* 中文走造字工房创基黑体，英文回退系统默认西文字体 */
    font-family:
      'ZaoZiGongFangChuangJiHei',
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, "Microsoft YaHei", 'Helvetica Neue', Arial, sans-serif;
    font-weight: 500;
  }

.attraction-location {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6e6e73;
  font-size: 0.9rem;
}

.location-icon {
  font-size: 0.9rem;
}

.attraction-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.stat-number {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1d1d1f;
}

.stat-label {
  font-size: 0.75rem;
  color: #8e8e93;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.rating-item {
  position: relative;
}

.rating-number {
  padding: 4px 8px;
  border-radius: 8px;
  color: white;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 分页部分 */
.pagination-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 0;
}

.pagination-info {
  color: #6e6e73;
  font-size: 1.02rem;
  text-align: center;
}

.pagination-controls {
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-start;
  max-width: 1200px;
  margin: 0;
  padding-left: 0;
}

.pagination-button {
  min-width: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #495057;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.pagination-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.pagination-button:hover::before {
  left: 100%;
}

.pagination-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #007aff 0%, #0056cc 100%);
  color: white;
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 122, 255, 0.3);
}

.pagination-button:active:not(:disabled) {
  transform: translateY(-1px) scale(0.98);
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.2);
}

.pagination-button:disabled {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #adb5bd;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.page-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-input-group label {
  color: #6e6e73;
  font-size: 0.9rem;
}

.page-input-group input {
  padding:10px;
  width: 80px;
  text-align: center;
}

/* 默认隐藏移动端 filters */
.mobile-filters {
  display: none;
}

.mobile-filters-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}

.mobile-filter-row {
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.mobile-filter-row .filter-label {
  flex: 0 0 auto; /* 左边文字不伸缩 */
  min-width: 80px; /* 可根据需要调整文字宽度 */
  font-weight: 600;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
}

/* 中间和右边输入框、下拉框统一样式 */
.mobile-filter-row select,
.mobile-filter-row input[type="search"],
.mobile-filter-row input[type="number"] {
  width: 100%;
  flex: 1 1 0;
  min-width: 0;
  box-sizing: border-box;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 12px;
  font-size: 0.8rem;
}

.mobile-filter-row > * {
  height: 36px; /* 保证输入框、选择框高度一致 */
  display: flex;
  align-items: center;
}

.mobile-filter-row > * + * {
  margin-left: 8px;
}

.mobile-filter-row input[type="number"] {
  -moz-appearance: textfield; /* 去掉 Firefox 上的上下箭头 */
}



.mobile-filter-row input::-webkit-outer-spin-button,
.mobile-filter-row input::-webkit-inner-spin-button {
  -webkit-appearance: none; /* 去掉 Chrome 上的上下箭头 */
  margin: 0;
}

.attraction-content-mobile {
  display: none;
}


/* 桌面端保持原样 */
@media (max-width: 768px) {

  .mobile-filters-grid > * + * {
    margin-top: 8px;
  }

  .pagination-section {
    gap: 0;
  }

  .pagination-section {
    margin-top: 0; /* 原 gap 7px */
  }

  .pagination-info {
    font-size: 0.83rem;
  }

  .attractions-section {
    margin-bottom: 8px;
  }

  .page-input-group label {
    color: #6e6e73;
    font-size: 0.85rem;
  }

  .page-input-group {
    gap: 0;
  }

  .page-input-group > * + * {
    margin-left: 8px;
  }

  .page-input-group input {
    padding:8px;
    font-size: 0.8rem;
    width: 50px;
    text-align: center;
  }

  .pagination-button {
    min-width: auto;
    padding: 10px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 750;
    gap: 0;
  }

  .pagination-button > * + * {
    margin-left: 10px;
  }

  .pagination-controls {
    gap: 0;
  }

  .pagination-controls > * {
    margin-bottom: 4px;
  }

  .pagination-controls > * + * {
    margin-left: 16px;
  }

  .scroll-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    padding-top: 0;
    padding-bottom: 10px;
  }

  .back-button {
    padding: 11px 16px;
    font-size: 14px;
    gap: 0;
  }

  .back-button > * + * {
    margin-left: 10px;
  }

  .attraction-content-mobile {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0; /* 缩小卡片内边距 */
  }

  .attraction-content-mobile > * + * {
    margin-top: 6px; /* 原 gap 6px */
  }

  .attraction-content-mobile .attraction-name {
    font-size: 13px;
    font-weight: 500;
    margin: 0;
    white-space: wrap; 
    line-height: 1.3;
    display: block;
    box-sizing: border-box;
  }

  .attraction-content-desktop {
    display: none;
  }

  .attractions-list {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 0;
    margin: -6px; /* 使用 margin 替代 gap 间距（原 12px） */
  }

  .attraction-item {
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 6px;
    gap: 0;
    margin: 6px;
    flex: 0 0 calc(50% - 12px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    max-width: calc(50% - 12px);
    width: calc(50% - 12px);
    box-sizing: border-box;
    overflow: hidden; 
  }

  /* 第一行：名字 */
  .attraction-name {
    font-size: 1.1rem;
    font-weight: 500;
    line-height: 1.2;
    white-space: wrap; 
    margin: 0;
  }

  /* 第二行：图片 + 右侧信息 */
  .attraction-info-row {
    display: flex;
    gap: 0;
    align-items: stretch; /* 让左右高度一致 */
    align-self:center;
  }

  .attraction-info-row > * + * {
    margin-left: 12px;
  }

  

  .attraction-name-text {
    font-size: 1rem; /* 缩小标题字体 */
    white-space: normal; /* 默认值，允许换行 */
    word-wrap: break-word; /* 遇到太长的单词时也换行 */
    overflow-wrap: break-word; /* 同上，标准写法 */
  }

  .stat-number {
    font-size: 0.95rem;
    font-weight: 700;
    color: white;
    padding: 2px 6px;
    border-radius: 6px;
  }

  .stat-label {
    font-size: 0.55rem;
    color: #8e8e93;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
  }

  /* 左侧图片 */
  .attraction-image-wrapper {
    flex-shrink: 0;
    width: 80px;
    height: 40px;
    border-radius: 12px;
    overflow: hidden;
  }

  .attraction-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scale(1);
    transform-origin: center center;
    transition: transform 0.28s ease;
    will-change: transform;
  }

  /* 右侧信息垂直分布 */
  .attraction-stats-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between; /* 上下平分 */
  }

  /* 好评率 */
  .attraction-stats {
    display: flex;
    gap: 0;
  }

  .attraction-stats > * + * {
    margin-left: 16px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    margin: 0; /* 卡片间距尽量小 */
    padding: 0; /* 去掉多余的内边距 */
  }

  .stat-item > * + * {
    margin-top: 2px;
  }


  /* 地点 */
  .attraction-location {
    display: flex;
    align-items: center;
    gap: 0;
    font-size: 0.55rem;
    color: #6e6e73;
  }

  .location-text {    white-space: nowrap;     /* 禁止换行 */
    overflow: hidden;        /* 隐藏超出部分 */
    text-overflow: ellipsis; /* 超出部分显示省略号 */
    display: inline-block;   /* 让 text-overflow 生效 */
    vertical-align: middle;  /* 对齐 */
  }
  
  .page-header {
    margin-bottom: 5px;
  }

  .fixed-header {
    padding: 12px 16px 0; /* 移动端：原 12px 的一半 */
  }

  .desktop-filters {
    display: none;
  }

  .page-subtitle {
    font-size: 0.8rem; /* 缩小副标题字体 */
    text-align: center;
  }

  .filters-section.card.mobile-filters {
    width: 100%; /* 卡片宽度自适应屏幕 */
    padding: 10px;
    box-sizing: border-box;
    margin: 0 auto 16px; /* 居中并加底部间距 */
  }

  .page-title {
    font-size: 1.5rem; /* 缩小标题字体 */
    text-align: center;
  }

  .title-english {
    font-size: 0.7rem;
    font-weight: 400;
    margin-bottom: 0;
    align-self:center;
  }

  .mobile-filters {
    padding: 8px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    max-width: 100%;
    box-sizing: border-box; /* 确保 padding 包含在宽度内 */
    overflow: visible; /* 让上方绝对定位的收藏按钮可见 */
    display: grid;
    gap: 0;
  }

  .mobile-filters > * + * {
    margin-top: 8px;
  }

  .mobile-filters-grid {
    --mobile-label-width: 88px;
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
  }

  .mobile-filters-grid > * + * {
    margin-top: 8px;
  }

  .favorites-button,
  .map-button {
    padding: 0 10px; /* 由父网格行控制高度 */
    font-size: 12px; /* 移动更小字体 */
    height: 100%;    /* 与同列输入同高 */
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .label-desktop { display: none; }
  .label-mobile { display: inline; }
  .mobile-filter-row > .button-pair { display: flex !important; width: 100%; flex: 1 1 0; min-width: 0; }
  .button-pair {
    align-items: stretch; /* 子按钮拉伸至与输入相同高度 */
    gap: 0;
  }
  .button-pair > * {
    flex: 1 1 0;
    min-width: 0;
  }
  .button-pair > * + * {
    margin-left: 8px;
  }

  .mobile-filter-row {
    display: grid;
    grid-template-columns: var(--mobile-label-width) minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 8px;
    align-items: center;
  }

  .mobile-filter-row > * + * {
    margin-left: 0;
  }

  .mobile-filter-row .filter-label {
    flex: 0 0 var(--mobile-label-width);
    width: var(--mobile-label-width);
  }

  .mobile-left-column,
  .mobile-right-column {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .mobile-left-column > * + *,
  .mobile-right-column > * + * {
    margin-top: 12px;
  }

  .favorites-actions-row {
    gap: 0;
  }

  .favorites-actions-row > * + * {
    margin-left: 10px;
  }

  .fav-tabs {
    gap: 0;
  }

  .fav-tabs > * + * {
    margin-left: 12px;
  }

  .favorites-list {
    gap: 0;
  }

  .favorites-list > * + * {
    margin-top: 8px;
  }

  .favorites-item {
    gap: 0;
  }

  .fav-content {
    gap: 0;
  }

  .fav-content > * + * {
    margin-left: 12px;
  }

  .favorites-context-menu {
    gap: 0;
  }

  .favorites-context-menu > * + * {
    margin-top: 8px;
  }

  .confirm-actions {
    gap: 0;
  }

  .confirm-actions > * + * {
    margin-left: 8px;
  }

  /* 第一行空白高度和左边行对齐 */
  .mobile-right-column .empty {
    height: 62px; /* 根据左边 filter-group 高度微调 */
  }

  .rating-number {
    padding: 2px 6px;
    border-radius: 6px;
    color: white;
    font-weight: 600;
    font-size: 12px;
  }
}

/* 桌面端：压缩固定区垂直占用（半高） */
@media (min-width: 1024px) {
  .filters-section { padding: 16px; } /* 原 32px 的一半 */
  .filters-grid { gap: 12px; } /* 原 24px 的一半 */
}
/* 桌面端：让返回按钮与标题水平排列，并整体略微上移 */
@media (min-width: 1024px) {
  .page-header {
    display: flex;
    align-items: center;
  }

  .header-content {
    text-align: left;
  }

  .back-button.desktop-back-button {
    margin-right: 16px;
  }
}
/* 桌面端：返回按钮在最左，标题/副标题整体居中 */
@media (min-width: 1024px) {

  .header-content {
    text-align: center;
    width: 100%;
  }

  .back-button.desktop-back-button {
    position: absolute;
    left: 0;
    top: 0;
    transform: none;
    margin-right: 0;
  }
}
.favorites-context-menu {
  position: fixed;
  z-index: 1200;
  min-width: 170px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(15,23,42,0.08);
  box-shadow: 0 18px 36px rgba(15,23,42,0.22);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.favorites-context-menu .context-menu-item {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.favorites-context-menu .fav-delete,
.favorites-context-menu .fav-pending {
  width: 100%;
}

@media (max-width: 768px) {
  .favorites-context-menu {
    gap: 0;
  }

  .favorites-context-menu > * + * {
    margin-top: 8px;
  }
}

</style>
/* 文案显示：桌面显示完整，移动显示简写 */
.label-desktop { display: inline; }
.label-mobile { display: none; }
