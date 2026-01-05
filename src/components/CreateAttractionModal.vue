<template>
  <div v-if="modelValue" class="modal-mask">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h3>{{ mode === 'edit' ? '编辑景点' : '创建景点' }}</h3>
        <button class="close" @click="close">×</button>
      </div>

      <div class="modal-body">
        <div class="form-grid">
          <label class="required">
            <span class="label-text">名称</span>
            <input v-model.trim="form.name" :disabled="isImported" />
          </label>

          <label>
            <span class="label-text">地区</span>
            <input v-model.trim="form.region" :disabled="isImported" />
          </label>

          <label>
            <span class="label-text">{{ countyLabel }}</span>
            <input v-model.trim="form.county" :disabled="isImported" />
          </label>

          

          <label class="full">
            <span class="label-text">具体位置</span>
            <input v-model.trim="form.position" :disabled="isImported" />
          </label>

          <label>
            <span class="label-text">建议游览时间</span>
            <input v-model.trim="form.duration" :disabled="isImported" />
          </label>

          

          <label class="full">
            <span class="label-text">概况</span>
            <textarea v-model.trim="form.details" rows="2" :disabled="isImported"></textarea>
          </label>

          <label class="full">
            <span class="label-text">详细介绍</span>
            <textarea v-model.trim="form.overview" rows="4" :disabled="isImported"></textarea>
          </label>

          <div class="full img-block">
            <div class="img-field">
              <span class="label-text">主图</span>
              <label class="upload-button" :class="{ danger: !!form.images.main, disabled: isImported }" @click="isImported ? null : onMainButtonClick($event)">
                <input v-if="!form.images.main && !isImported" type="file" accept="image/*" @change="onMainImage" />
                <span>{{ form.images.main ? '取消选择' : '选择图片' }}</span>
              </label>
              <img v-if="form.images.main" :src="form.images.main" alt="main" />
            </div>
            <div class="img-field">
              <span class="label-text">次图1</span>
              <label class="upload-button" :class="{ danger: !!form.images.secondary[0], disabled: isImported }" @click="isImported ? null : onSecondaryButtonClick(0, $event)">
                <input v-if="!form.images.secondary[0] && !isImported" type="file" accept="image/*" @change="e => onSecondaryImage(e, 0)" />
                <span>{{ form.images.secondary[0] ? '取消选择' : '选择图片' }}</span>
              </label>
              <img v-if="form.images.secondary[0]" :src="form.images.secondary[0]" alt="sec1" />
            </div>
            <div class="img-field">
              <span class="label-text">次图2</span>
              <label class="upload-button" :class="{ danger: !!form.images.secondary[1], disabled: isImported }" @click="isImported ? null : onSecondaryButtonClick(1, $event)">
                <input v-if="!form.images.secondary[1] && !isImported" type="file" accept="image/*" @change="e => onSecondaryImage(e, 1)" />
                <span>{{ form.images.secondary[1] ? '取消选择' : '选择图片' }}</span>
              </label>
              <img v-if="form.images.secondary[1]" :src="form.images.secondary[1]" alt="sec2" />
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="ghost" @click="close">取消</button>
        <button class="primary" :disabled="!canSubmit || loading || isImported" @click="submit">
          <span v-if="!loading">{{ mode === 'edit' ? '修改' : '创建' }}</span>
          <span v-else>正在更新...</span>
        </button>
      </div>

      <div v-if="loading" class="modal-loading-overlay">
        <div class="modal-loading-spinner"></div>
      </div>
    </div>
  </div>
  <div v-else class="hidden-backdrop" @click="close"></div>
</template>

<script>
  import { addCustomAttraction, updateCustomAttraction } from '../utils/customAttractions.js'
  import { getImageUrl as getCustomImageUrl, setImage as setCustomImage, deleteImage as deleteCustomImage, deleteImagesForId as deleteCustomImagesForId } from '../utils/customImageStore.js'
  import { getGeoKeys } from '../utils/geoKeys.js'
  import { uploadCustomImage, deleteCustomImages } from '../stores/userDataSync.js'

  const CUSTOM_IMAGE_UPLOAD_MAX_BYTES = 900 * 1024
  const CUSTOM_IMAGE_UPLOAD_MAX_SIDE = 1600

export default {
  name: 'CreateAttractionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    countyLabel: { type: String, default: '省份/州' },
    mode: { type: String, default: 'create' }, // 'create' | 'edit'
    initial: { type: Object, default: null }
  },
  emits: ['update:modelValue', 'created', 'updated'],
  data() {
    return {
      geoKeys: null,
      loading: false,
      form: {
        name: '',
        region: '',
        county: '',
        position: '',
        duration: '',
        details: '',
        overview: '',
        images: { main: '', secondary: ['', ''] }
      },
      mainCleared: false,
      secondaryCleared: [false, false]
    }
  },
  computed: {
    canSubmit() {
      // 仅名称必填，主图可选
      return !!this.form.name
    },
    isImported() {
      // 检查是否为来自导入的自创景点
      return this.mode === 'edit' && this.initial && this.initial.isImported === true
    }
  },
  mounted() {
    try { if (this.mode === 'edit' && this.initial && this.modelValue) { this.loadFromInitialWithSpinner() } } catch(e) {}
  },
  watch: {
    modelValue(val){
      if (val && this.mode==='edit' && this.initial) { this.loadFromInitialWithSpinner() }
    }
  },
  methods: {
    close() { this.$emit('update:modelValue', false) },
    async loadFromInitialWithSpinner() {
      this.mainCleared = false
      this.secondaryCleared = [false, false]
      this.form.name = this.initial.name || ''
      this.form.region = this.initial.region || ''
      this.form.county = this.initial.county || ''
      this.form.position = this.initial.position || ''
      this.form.duration = this.initial.duration || ''
      this.form.details = this.initial.details || ''
      this.form.overview = this.initial.overview || ''
      const id = this.initial.id
      const tasks = []
      if (this.initial.hasImage1 && !this.form.images.main) {
        tasks.push((async () => {
          const u = await getCustomImageUrl(`${id}:main`)
          if (u) this.form.images.main = u
        })())
      }
      if (this.initial.hasImage2 && !this.form.images.secondary[0]) {
        tasks.push((async () => {
          const u = await getCustomImageUrl(`${id}:sec0`)
          if (u) {
            this.$set ? this.$set(this.form.images.secondary, 0, u) : (this.form.images.secondary[0] = u)
          }
        })())
      }
      if (this.initial.hasImage3 && !this.form.images.secondary[1]) {
        tasks.push((async () => {
          const u = await getCustomImageUrl(`${id}:sec1`)
          if (u) {
            this.$set ? this.$set(this.form.images.secondary, 1, u) : (this.form.images.secondary[1] = u)
          }
        })())
      }
      if (tasks.length) {
        this.loading = true
        try {
          await Promise.all(tasks)
        } finally {
          this.loading = false
        }
      }
    },
    loadFromInitial() {
      try {
        this.mainCleared = false
        this.secondaryCleared = [false, false]
        // 文本类字段
        this.form.name = this.initial.name || ''
        this.form.region = this.initial.region || ''
        this.form.county = this.initial.county || ''
        this.form.position = this.initial.position || ''
        this.form.duration = this.initial.duration || ''
        this.form.details = this.initial.details || ''
        this.form.overview = this.initial.overview || ''
        // 图片：仅在当前未选择时加载已有缓存，避免覆盖用户刚刚选择的图
        const id = this.initial.id
        if (this.initial.hasImage1 && !this.form.images.main) {
          getCustomImageUrl(`${id}:main`).then(u=>{ if(u) this.form.images.main = u })
        }
        if (this.initial.hasImage2 && !this.form.images.secondary[0]) {
          getCustomImageUrl(`${id}:sec0`).then(u=>{ if(u) this.$set ? this.$set(this.form.images.secondary, 0, u) : (this.form.images.secondary[0] = u) })
        }
        if (this.initial.hasImage3 && !this.form.images.secondary[1]) {
          getCustomImageUrl(`${id}:sec1`).then(u=>{ if(u) this.$set ? this.$set(this.form.images.secondary, 1, u) : (this.form.images.secondary[1] = u) })
        }
      } catch(e) {}
    },
    readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },
    async blobToDataURL(blob) {
      return new Promise((resolve) => {
        try {
          const fr = new FileReader()
          fr.onload = () => resolve(fr.result || '')
          fr.onerror = () => resolve('')
          fr.readAsDataURL(blob)
        } catch (e) { resolve('') }
      })
    },
    byteSize(val) {
      try { return new Blob([String(val || '')]).size } catch (e) { return String(val || '').length }
    },
    async compressImageDataUrl(dataUrl, options = {}) {
      try {
        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return dataUrl || ''
        const maxBytes = Number.isFinite(options.maxBytes) ? options.maxBytes : CUSTOM_IMAGE_UPLOAD_MAX_BYTES
        const maxSide = Number.isFinite(options.maxSide) ? options.maxSide : CUSTOM_IMAGE_UPLOAD_MAX_SIDE
        if (maxBytes && this.byteSize(dataUrl) <= maxBytes) return dataUrl

        let blob = null
        try {
          const resp = await fetch(dataUrl)
          blob = await resp.blob()
        } catch (e) {
          blob = null
        }
        if (!blob) return dataUrl

        const img = await new Promise((resolve) => {
          let url = ''
          try { url = URL.createObjectURL(blob) } catch (e) { url = '' }
          if (!url) return resolve(null)
          try {
            const el = new Image()
            el.onload = () => {
              try { URL.revokeObjectURL(url) } catch (e) {}
              resolve(el)
            }
            el.onerror = () => {
              try { URL.revokeObjectURL(url) } catch (e) {}
              resolve(null)
            }
            el.src = url
          } catch (e) {
            try { URL.revokeObjectURL(url) } catch (err) {}
            resolve(null)
          }
        })
        if (!img) return dataUrl

        const srcW = img.naturalWidth || img.width || 0
        const srcH = img.naturalHeight || img.height || 0
        if (!srcW || !srcH) return dataUrl

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return dataUrl

        const maxSide0 = Math.max(1, maxSide || CUSTOM_IMAGE_UPLOAD_MAX_SIDE)
        const scale0 = Math.min(1, maxSide0 / Math.max(srcW, srcH))
        let w = Math.max(1, Math.round(srcW * scale0))
        let h = Math.max(1, Math.round(srcH * scale0))

        const qualities = [0.85, 0.78, 0.72, 0.66, 0.6, 0.55, 0.5, 0.45]
        let best = ''
        let bestBytes = Infinity

        for (let pass = 0; pass < 4; pass++) {
          canvas.width = w
          canvas.height = h
          try {
            ctx.fillStyle = '#fff'
            ctx.fillRect(0, 0, w, h)
            ctx.drawImage(img, 0, 0, w, h)
          } catch (e) {}
          for (const q of qualities) {
            let out = ''
            try { out = canvas.toDataURL('image/jpeg', q) || '' } catch (e) { out = '' }
            if (!out) continue
            const outBytes = this.byteSize(out)
            if (outBytes < bestBytes) {
              best = out
              bestBytes = outBytes
            }
            if (maxBytes && outBytes <= maxBytes) return out
          }
          w = Math.max(1, Math.round(w * 0.85))
          h = Math.max(1, Math.round(h * 0.85))
          if (w < 320 || h < 320) break
        }

        return best || dataUrl
      } catch (e) {
        return dataUrl || ''
      }
    },
    async onMainImage(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const raw = await this.readFileAsDataURL(file)
      this.form.images.main = await this.compressImageDataUrl(raw)
      this.mainCleared = false
    },
    async onSecondaryImage(e, idx) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const raw = await this.readFileAsDataURL(file)
      const url = await this.compressImageDataUrl(raw)
      this.$set ? this.$set(this.form.images.secondary, idx, url) : (this.form.images.secondary[idx] = url)
      if (idx === 0 || idx === 1) {
        this.$set ? this.$set(this.secondaryCleared, idx, false) : (this.secondaryCleared[idx] = false)
      }
    },
    onMainButtonClick(e){
      if (this.isImported) return
      if (this.form.images.main) {
        try { e && e.preventDefault && e.preventDefault() } catch(_) {}
        try { e && e.stopPropagation && e.stopPropagation() } catch(_) {}
        this.clearMainImage()
      }
    },
    onSecondaryButtonClick(idx, e){
      if (this.isImported) return
      if (this.form.images.secondary[idx]) {
        try { e && e.preventDefault && e.preventDefault() } catch(_) {}
        try { e && e.stopPropagation && e.stopPropagation() } catch(_) {}
        this.clearSecondaryImage(idx)
      }
    },
    clearMainImage() {
      this.form.images.main = ''
      this.mainCleared = true
    },
    clearSecondaryImage(idx) {
      if (idx === 0 || idx === 1) {
        this.$set ? this.$set(this.form.images.secondary, idx, '') : (this.form.images.secondary[idx] = '')
        this.$set ? this.$set(this.secondaryCleared, idx, true) : (this.secondaryCleared[idx] = true)
      }
    },
    async submit() {
      if (!this.canSubmit || this.loading) return
      // 检查是否为来自导入的自创景点，如果是则阻止编辑
      if (this.isImported) {
        try { alert('无法编辑来自导入的自创景点') } catch (_) {}
        return
      }
      this.loading = true
      try {
        const id = (this.mode === 'edit' && this.initial && this.initial.id)
        ? String(this.initial.id)
        : ('custom_' + Date.now())
      const existingImages = (this.initial && this.initial.images) || {}
      const imageRefs = {
        main: (existingImages && existingImages.main) || '',
        secondary: Array.isArray(existingImages && existingImages.secondary) ? [...existingImages.secondary] : []
      }
      while (imageRefs.secondary.length < 2) imageRefs.secondary.push('')
      const toDeleteRemote = []

      // 先把图片写入 IndexedDB，避免localStorage 超限失败；编辑模式下，未重新上传则保留原图
      try {
        if (this.form.images.main) {
          await setCustomImage(`${id}:main`, this.form.images.main)
        }
        if (this.form.images.secondary[0]) {
          await setCustomImage(`${id}:sec0`, this.form.images.secondary[0])
        }
        if (this.form.images.secondary[1]) {
          await setCustomImage(`${id}:sec1`, this.form.images.secondary[1])
        }
        if (this.mode === 'edit' && this.initial) {
          if (this.initial.hasImage1 && !this.form.images.main) {
            await deleteCustomImage(`${id}:main`)
          }
          if (this.initial.hasImage2 && !this.form.images.secondary[0]) {
            await deleteCustomImage(`${id}:sec0`)
          }
          if (this.initial.hasImage3 && !this.form.images.secondary[1]) {
            await deleteCustomImage(`${id}:sec1`)
          }
        }
      } catch (e) {}

      const initialImages = (this.initial && this.initial.images) || {}
      const normalizeForUpload = async (val) => {
        if (!val) return { shouldUpload: false, dataUrl: '' }
        if (typeof val === 'string' && val.startsWith('data:')) {
          const dataUrl = await this.compressImageDataUrl(val)
          return dataUrl ? { shouldUpload: true, dataUrl } : { shouldUpload: false, dataUrl: '' }
        }
        if (typeof val === 'string' && (val.startsWith('blob:') || val.startsWith('http'))) {
          try {
            const resp = await fetch(val)
            const blob = await resp.blob()
            const raw = await this.blobToDataURL(blob)
            const dataUrl = await this.compressImageDataUrl(raw)
            return dataUrl ? { shouldUpload: true, dataUrl } : { shouldUpload: false, dataUrl: '' }
          } catch (e) { return { shouldUpload: false, dataUrl: '' } }
        }
        return { shouldUpload: false, dataUrl: '' }
      }
      const uploadSlot = async (slot, dataUrl) => {
        if (!dataUrl) return null
        const attempts = [
          { maxBytes: CUSTOM_IMAGE_UPLOAD_MAX_BYTES, maxSide: CUSTOM_IMAGE_UPLOAD_MAX_SIDE },
          { maxBytes: 450 * 1024, maxSide: 1280 },
          { maxBytes: 250 * 1024, maxSide: 960 }
        ]
        let lastErr = null
        let cur = dataUrl
        for (const cfg of attempts) {
          cur = await this.compressImageDataUrl(cur, cfg)
          try {
            const key = await uploadCustomImage(id, slot, cur)
            if (key) return key
          } catch (e) {
            lastErr = e
          }
        }
        const msg = '图片上传失败：请换小一点的图片，或稍后重试（后端可能限制了上传大小）。'
        const err = new Error(msg)
        err.cause = lastErr
        throw err
      }

      // main
      const normMain = await normalizeForUpload(this.form.images.main)
      const mainChanged = normMain.shouldUpload && this.form.images.main !== (initialImages.main || '')
      if (mainChanged) {
        const uploadedMain = await uploadSlot('main', normMain.dataUrl)
        if (imageRefs.main && imageRefs.main !== uploadedMain) toDeleteRemote.push(imageRefs.main)
        imageRefs.main = uploadedMain
      } else if (this.mainCleared) {
        if (imageRefs.main) toDeleteRemote.push(imageRefs.main)
        imageRefs.main = ''
      }

      // sec0
      const normSec0 = await normalizeForUpload(this.form.images.secondary[0])
      const sec0Changed = normSec0.shouldUpload && this.form.images.secondary[0] !== (initialImages.secondary && initialImages.secondary[0] || '')
      if (sec0Changed) {
        const uploadedSec0 = await uploadSlot('sec0', normSec0.dataUrl)
        if (imageRefs.secondary[0] && imageRefs.secondary[0] !== uploadedSec0) toDeleteRemote.push(imageRefs.secondary[0])
        imageRefs.secondary[0] = uploadedSec0
      } else if (this.secondaryCleared[0]) {
        if (imageRefs.secondary[0]) toDeleteRemote.push(imageRefs.secondary[0])
        imageRefs.secondary[0] = ''
      }

      // sec1
      const normSec1 = await normalizeForUpload(this.form.images.secondary[1])
      const sec1Changed = normSec1.shouldUpload && this.form.images.secondary[1] !== (initialImages.secondary && initialImages.secondary[1] || '')
      if (sec1Changed) {
        const uploadedSec1 = await uploadSlot('sec1', normSec1.dataUrl)
        if (imageRefs.secondary[1] && imageRefs.secondary[1] !== uploadedSec1) toDeleteRemote.push(imageRefs.secondary[1])
        imageRefs.secondary[1] = uploadedSec1
      } else if (this.secondaryCleared[1]) {
        if (imageRefs.secondary[1]) toDeleteRemote.push(imageRefs.secondary[1])
        imageRefs.secondary[1] = ''
      }

      // 若为编辑模式，清理该自创景点的地理编码浏览器缓存（视为全新景点）
      try {
        if (this.mode === 'edit' && this.initial) {
          const storeKey = 'geoCache_v1'
          const raw = localStorage.getItem(storeKey)
          if (raw) {
            const obj = JSON.parse(raw) || {}
            const cacheKey = `custom|${id}`
            if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, cacheKey)) {
              try { console.info('[Geo][Custom] clear cached geocode due to edit', { id, cacheKey }); } catch (_) {}
              delete obj[cacheKey]
              localStorage.setItem(storeKey, JSON.stringify(obj))
            }
          }
        }
      } catch (e) {}

      // 清理本地缓存的旧图，确保下次读取不会返回旧版本
      try { await deleteCustomImagesForId(id); } catch (e) {}
      // 可选：将最新 dataURL 写回缓存以便立即展示
      try {
        if (this.form.images.main && this.form.images.main.startsWith('data:') && imageRefs.main) {
          await setCustomImage(`${id}:main`, this.form.images.main)
        }
        if (this.form.images.secondary[0] && this.form.images.secondary[0].startsWith('data:') && imageRefs.secondary[0]) {
          await setCustomImage(`${id}:sec0`, this.form.images.secondary[0])
        }
        if (this.form.images.secondary[1] && this.form.images.secondary[1].startsWith('data:') && imageRefs.secondary[1]) {
          await setCustomImage(`${id}:sec1`, this.form.images.secondary[1])
        }
      } catch (e) {}

      const attraction = {
        id,
        country: 'custom',
        name: this.form.name,
        region: this.form.region,
        county: this.form.county,
        position: this.form.position,
        duration: this.form.duration,
        details: this.form.details,
        overview: this.form.overview,
        hasImage1: !!imageRefs.main,
        hasImage2: !!imageRefs.secondary[0],
        hasImage3: !!imageRefs.secondary[1],
        images: {
          main: imageRefs.main || '',
          secondary: [imageRefs.secondary[0] || '', imageRefs.secondary[1] || '']
        },
        createdAt: new Date().toISOString()
      }
      // 删除被替换或清除的远端图片
      try {
        if (toDeleteRemote.length) {
          await deleteCustomImages(toDeleteRemote)
        }
      } catch (e) {}
      const saved = addCustomAttraction(attraction)
      // 异步预先建立地理编码缓存（自创景点统一异步），两端页面共用
      try { this.prefetchCustomGeocode(saved); } catch (e) {}
      if (this.mode === 'edit') this.$emit('updated', saved); else this.$emit('created', saved)
      this.$emit('update:modelValue', false)
      } catch (e) {
        try { alert((e && e.message) ? e.message : '保存失败，请稍后重试') } catch (_) {}
      } finally {
        this.loading = false
      }
    },

    async prefetchCustomGeocode(attraction) {
      try {
        if (!attraction || !attraction.id) return;
        const id = String(attraction.id);
        // 构造与地图一致的地址（position 优先）
        const addr = `${attraction.position || ''} ${attraction.name || ''} ${attraction.region || ''} ${attraction.county || ''}`.trim();
        if (!addr) return;
        try { console.groupCollapsed('[Geo][Custom] prefetch start'); console.info('id', id); console.info('address', addr); } catch (_) {}

        // 选择性国家偏置（仅当 position 含中文 → 中国）
        const isChinesePosition = /[\u4e00-\u9fa5]/.test(String(attraction.position || ''));
        const iso2 = isChinesePosition ? 'cn' : '';
        // 若 position 含中文则优先使用高德地理编码（需服务端提供的 amapKey）
        try {
          if (!this.geoKeys) {
            this.geoKeys = await getGeoKeys();
          }
          const amapKey = this.geoKeys && this.geoKeys.amapKey;
          let didTryAmap = false;
          if (isChinesePosition && amapKey) {
            didTryAmap = true;
            // 内联 GCJ-02 -> WGS84 转换
            const outOfChina = (lat, lng) => !(lat >= 0.8293 && lat <= 55.8271 && lng >= 72.004 && lng <= 137.8347);
            const tLat = (x, y) => {
              const PI = Math.PI; let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
              ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
              ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
              ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0; return ret; };
            const tLng = (x, y) => {
              const PI = Math.PI; let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
              ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
              ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
              ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0; return ret; };
            const gcj02ToWgs84 = (lat, lng) => {
              if (outOfChina(lat, lng)) return [lat, lng];
              const PI = Math.PI, a = 6378245.0, ee = 0.00669342162296594323;
              let dLat = tLat(lng - 105.0, lat - 35.0), dLng = tLng(lng - 105.0, lat - 35.0);
              const radLat = lat / 180.0 * PI; let magic = Math.sin(radLat); magic = 1 - ee * magic * magic; const sqrtMagic = Math.sqrt(magic);
              dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
              dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
              return [lat - dLat, lng - dLng]; };

            const headers = { 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8' };
            const url1 = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(addr)}&key=${amapKey}`;
            try { console.info('[Geo][Custom] try AMap geocode', { url: url1 }); } catch (_) {}
            try {
              const r1 = await fetch(url1, { headers });
              if (r1 && r1.ok) {
                const j1 = await r1.json();
                if (j1 && Array.isArray(j1.geocodes) && j1.geocodes[0] && typeof j1.geocodes[0].location === 'string') {
                  const [lng, lat] = j1.geocodes[0].location.split(',').map(parseFloat);
                  if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    const [wlat, wlng] = gcj02ToWgs84(lat, lng);
                    this._mergeGeoPut(`custom|${id}`, wlat, wlng);
                    try { console.info('[Geo][Custom] success AMap geocode', { provider: 'amap-geocode', gcj02: { lat, lng }, wgs84: { lat: wlat, lng: wlng } }); } catch (_) {}
                    try { console.groupEnd && console.groupEnd(); } catch (_) {}
                    return;
                  }
                }
              }
            } catch (_) {}

            const url2 = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(addr)}&key=${amapKey}&children=0&offset=1&page=1&extensions=base`;
            try { console.info('[Geo][Custom] try AMap POI', { url: url2 }); } catch (_) {}
            try {
              const r2 = await fetch(url2, { headers });
              if (r2 && r2.ok) {
                const j2 = await r2.json();
                if (j2 && Array.isArray(j2.pois) && j2.pois[0] && typeof j2.pois[0].location === 'string') {
                  const [lng, lat] = j2.pois[0].location.split(',').map(parseFloat);
                  if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    const [wlat, wlng] = gcj02ToWgs84(lat, lng);
                    this._mergeGeoPut(`custom|${id}`, wlat, wlng);
                    try { console.info('[Geo][Custom] success AMap POI', { provider: 'amap-poi', gcj02: { lat, lng }, wgs84: { lat: wlat, lng: wlng } }); } catch (_) {}
                    try { console.groupEnd && console.groupEnd(); } catch (_) {}
                    return;
                  }
                }
              }
            } catch (_) {}
            // 若已尝试高德但未成功，移除此景点的所有中国提示标记（下次不再按中文处理）
            try { updateCustomAttraction(id, { disableChinaHint: true }); try { console.info('[Geo][Custom] disable China hint for this attraction due to AMap failure', { id }); } catch (_) {} } catch (_) {}
          }
        } catch (_) {}

        // 轻量地理编码：Photon → Open-Meteo → Nominatim
        // 若前面已针对中文地址优先尝试过高德且未命中，则后续服务统一使用英文并不再附加中国相关提示
        const hasAmapKey = !!(this.geoKeys && this.geoKeys.amapKey);
        const useEnglish = !!(isChinesePosition && hasAmapKey);
        const headers = { 'accept-language': useEnglish ? 'en-US,en;q=0.9' : 'zh-CN,zh;q=0.9,en;q=0.8' };
        const getJson = async (url) => {
          try { const r = await fetch(url, { headers }); if (!r.ok) return null; return await r.json(); } catch (_) { return null; }
        };
        // 1) Photon
        const params1 = new URLSearchParams({ q: addr, limit: '1', lang: (useEnglish ? 'en' : 'zh') });
        try { console.info('[Geo][Custom] try Photon', { url: `https://photon.komoot.io/api/?${params1.toString()}` }); } catch (_) {}
        const j1 = await getJson(`https://photon.komoot.io/api/?${params1.toString()}`);
        try {
          const f = j1 && Array.isArray(j1.features) && j1.features[0];
          const c = f && f.geometry && f.geometry.coordinates;
          if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) { this._mergeGeoPut(`custom|${id}`, c[1], c[0]); return; }
        } catch (_) {}
        // 2) Open-Meteo
        const params2 = new URLSearchParams({ name: addr, count: '1', language: (useEnglish ? 'en' : 'zh') });
        const iso2Fb = useEnglish ? '' : iso2;
        if (iso2Fb) params2.append('country_code', iso2Fb);
        try { console.info('[Geo][Custom] try Open-Meteo', { url: `https://geocoding-api.open-meteo.com/v1/search?${params2.toString()}` }); } catch (_) {}
        const j2 = await getJson(`https://geocoding-api.open-meteo.com/v1/search?${params2.toString()}`);
        try {
          const r = j2 && Array.isArray(j2.results) && j2.results[0];
          if (r && Number.isFinite(r.latitude) && Number.isFinite(r.longitude)) { this._mergeGeoPut(`custom|${id}`, r.latitude, r.longitude); return; }
        } catch (_) {}
        // 3) Nominatim
        const params3 = new URLSearchParams({ format: 'json', q: addr, limit: '1', addressdetails: '0' });
        if (iso2Fb) params3.append('countrycodes', iso2Fb);
        try { console.info('[Geo][Custom] try Nominatim', { url: `https://nominatim.openstreetmap.org/search?${params3.toString()}` }); } catch (_) {}
        const j3 = await getJson(`https://nominatim.openstreetmap.org/search?${params3.toString()}`);
        try {
          const r = Array.isArray(j3) && j3[0];
          const lat = r && parseFloat(r.lat); const lng = r && parseFloat(r.lon);
          if (Number.isFinite(lat) && Number.isFinite(lng)) { this._mergeGeoPut(`custom|${id}`, lat, lng); return; }
        } catch (_) {}
        try { console.groupEnd(); } catch (_) {}
      } catch (e) { try { console.groupEnd(); } catch (_) {} }
    },

    _mergeGeoPut(key, lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !key) return;
      const storeKey = 'geoCache_v1';
      let latest = {};
      try { const raw = localStorage.getItem(storeKey); latest = raw ? (JSON.parse(raw) || {}) : {}; } catch (e) { latest = {}; }
      latest[key] = { lat, lng, ts: Date.now() };
      try { localStorage.setItem(storeKey, JSON.stringify(latest)); } catch (e) {}
    }
  }
}
</script>

<style scoped>
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 2000; overflow: hidden; }
.modal { position: relative; width: min(680px, 94vw); max-width: 94vw; max-height: 80vh; overflow: hidden; background: #fff; border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.18); display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #eef0f3; }
.modal-body { padding: 16px; overflow: auto; overflow-x: hidden; }
.modal-body { -webkit-overflow-scrolling: touch; }
.modal-footer { padding: 12px 16px; border-top: 1px solid #eef0f3; display: flex; justify-content: flex-end; gap: 8px; }
.close { font-size: 18px; background: none; border: none; cursor: pointer; }
.primary { background: #3b82f6; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
.primary:hover { filter: brightness(0.95); }
.primary:disabled { opacity: .5; cursor: not-allowed; }
.ghost { background: #fff; border: 1px solid #cfd6e4; color: #334155; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
.ghost:hover { background: #f6f8fa; }

.modal-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.modal-loading-spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid #d1d5db;
  border-top-color: #3b82f6;
  animation: modal-spin 0.8s linear infinite;
}
@keyframes modal-spin {
  to { transform: rotate(360deg); }
}

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; max-width: 100%; }
label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #334155; }
label .label-text { font-size: 13px; color: #334155; }
label.required .label-text, .img-field > span.required { color: #f43f5e; }
label input, label textarea { width: 100%; max-width: 100%; box-sizing: border-box; border: 1px solid #d8dee9; border-radius: 8px; padding: 8px 10px; font-size: 14px; }
label.full { grid-column: 1 / -1; }
.form-grid > .full { grid-column: 1 / -1; }

.img-block { display: flex; gap: 12px; align-items: stretch; width: 100%; box-sizing: border-box; }
.img-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1 1 0; }
.img-field > span { font-size: 13px; color: #334155; }
.img-field { overflow: hidden; }
.upload-button { position: relative; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 6px; padding: 12px; border-radius: 8px; background: #d1fae5; color: #065f46; border: 1px solid #86efac; font-weight: 600; cursor: pointer; user-select: none; width: 100%; box-sizing: border-box; }
.upload-button input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; border: 0; padding: 0; margin: 0; }
.upload-button span { pointer-events: none; }
.upload-button:hover { background: #a7f3d0; }
.upload-button:active { transform: translateY(1px); }
.upload-button.danger { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
.upload-button.danger:hover { background: #fecaca; }
.upload-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #e5e7eb;
  color: #6b7280;
  border-color: #d1d5db;
}
.upload-button.disabled:hover {
  background: #e5e7eb;
  transform: none;
}
.img-field img { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e9f2; }

@media (max-width: 768px) {
  .modal { width: 94vw; max-width: 94vw; }
  .form-grid { grid-template-columns: 1fr; }
  .img-block { flex-direction: row; }
}

@media (min-width: 1024px) {
  .img-block { flex-direction: row; }
}
</style>
