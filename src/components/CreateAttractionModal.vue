<template>
  <div v-if="modelValue" class="modal-mask">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h3>{{ mode === 'edit' ? '修改景点' : '创建景点' }}</h3>
        <button class="close" @click="close">×</button>
      </div>

      <div class="modal-body">
        <div class="form-grid">
          <label class="required">
            <span class="label-text">名称</span>
            <input v-model.trim="form.name" />
          </label>

          <label>
            <span class="label-text">地区</span>
            <input v-model.trim="form.region" />
          </label>

          <label>
            <span class="label-text">{{ countyLabel }}</span>
            <input v-model.trim="form.county" />
          </label>

          

          <label class="full">
            <span class="label-text">具体位置</span>
            <input v-model.trim="form.position" />
          </label>

          <label>
            <span class="label-text">建议游览时间</span>
            <input v-model.trim="form.duration" />
          </label>

          

          <label class="full">
            <span class="label-text">概况</span>
            <textarea v-model.trim="form.details" rows="2"></textarea>
          </label>

          <label class="full">
            <span class="label-text">详细介绍</span>
            <textarea v-model.trim="form.overview" rows="4"></textarea>
          </label>

          <div class="full img-block">
            <div class="img-field">
              <span class="label-text">主图</span>
              <label class="upload-button" :class="{ danger: !!form.images.main }" @click="onMainButtonClick($event)">
                <input v-if="!form.images.main" type="file" accept="image/*" @change="onMainImage" />
                <span>{{ form.images.main ? '取消选择' : '选择图片' }}</span>
              </label>
              <img v-if="form.images.main" :src="form.images.main" alt="main" />
            </div>
            <div class="img-field">
              <span class="label-text">次图1</span>
              <label class="upload-button" :class="{ danger: !!form.images.secondary[0] }" @click="onSecondaryButtonClick(0, $event)">
                <input v-if="!form.images.secondary[0]" type="file" accept="image/*" @change="e => onSecondaryImage(e, 0)" />
                <span>{{ form.images.secondary[0] ? '取消选择' : '选择图片' }}</span>
              </label>
              <img v-if="form.images.secondary[0]" :src="form.images.secondary[0]" alt="sec1" />
            </div>
            <div class="img-field">
              <span class="label-text">次图2</span>
              <label class="upload-button" :class="{ danger: !!form.images.secondary[1] }" @click="onSecondaryButtonClick(1, $event)">
                <input v-if="!form.images.secondary[1]" type="file" accept="image/*" @change="e => onSecondaryImage(e, 1)" />
                <span>{{ form.images.secondary[1] ? '取消选择' : '选择图片' }}</span>
              </label>
              <img v-if="form.images.secondary[1]" :src="form.images.secondary[1]" alt="sec2" />
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="ghost" @click="close">取消</button>
        <button class="primary" :disabled="!canSubmit" @click="submit">{{ mode === 'edit' ? '修改' : '创建' }}</button>
      </div>
    </div>
  </div>
  <div v-else class="hidden-backdrop" @click="close"></div>
</template>

<script>
  import { addCustomAttraction } from '../utils/customAttractions.js'
  import { getImageUrl as getCustomImageUrl, setImage as setCustomImage, deleteImage as deleteCustomImage } from '../utils/customImageStore.js'

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
      form: {
        name: '',
        region: '',
        county: '',
        position: '',
        duration: '',
        details: '',
        overview: '',
        images: { main: '', secondary: ['', ''] }
      }
    }
  },
  computed: {
    canSubmit() {
      // 仅名称必填，主图可选
      return !!this.form.name
    }
  },
  mounted() {
    try { if (this.mode === 'edit' && this.initial && this.modelValue) { this.loadFromInitial() } } catch(e) {}
  },
  watch: {
    modelValue(val){
      if (val && this.mode==='edit' && this.initial) { this.loadFromInitial() }
    }
  },
  methods: {
    close() { this.$emit('update:modelValue', false) },
    loadFromInitial() {
      try {
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
    async onMainImage(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      this.form.images.main = await this.readFileAsDataURL(file)
    },
    async onSecondaryImage(e, idx) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const url = await this.readFileAsDataURL(file)
      this.$set ? this.$set(this.form.images.secondary, idx, url) : (this.form.images.secondary[idx] = url)
    },
    onMainButtonClick(e){
      if (this.form.images.main) {
        try { e && e.preventDefault && e.preventDefault() } catch(_) {}
        try { e && e.stopPropagation && e.stopPropagation() } catch(_) {}
        this.clearMainImage()
      }
    },
    onSecondaryButtonClick(idx, e){
      if (this.form.images.secondary[idx]) {
        try { e && e.preventDefault && e.preventDefault() } catch(_) {}
        try { e && e.stopPropagation && e.stopPropagation() } catch(_) {}
        this.clearSecondaryImage(idx)
      }
    },
    clearMainImage() {
      this.form.images.main = ''
    },
    clearSecondaryImage(idx) {
      if (idx === 0 || idx === 1) {
        this.$set ? this.$set(this.form.images.secondary, idx, '') : (this.form.images.secondary[idx] = '')
      }
    },
    async submit() {
      if (!this.canSubmit) return
      const id = (this.mode === 'edit' && this.initial && this.initial.id)
        ? String(this.initial.id)
        : ('custom_' + Date.now())

      // 先把图片写入 IndexedDB，避免 localStorage 超限失败；编辑模式下，未重新上传则保留原图
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
        // 编辑模式下，清理不再使用的图片缓存
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
        // 是否存在图片：以当前表单为准，用户删除后为 false，避免详情页显示 skeleton
        hasImage1: !!this.form.images.main,
        hasImage2: !!this.form.images.secondary[0],
        hasImage3: !!this.form.images.secondary[1],
        images: {
          main: '',
          secondary: []
        },
        createdAt: new Date().toISOString()
      }
      const saved = addCustomAttraction(attraction)
      if (this.mode === 'edit') this.$emit('updated', saved); else this.$emit('created', saved)
      this.$emit('update:modelValue', false)
    }
  }
}
</script>

<style scoped>
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 2000; overflow: hidden; }
.modal { width: min(680px, 94vw); max-width: 94vw; max-height: 80vh; overflow: hidden; background: #fff; border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.18); display: flex; flex-direction: column; }
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
