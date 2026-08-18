<template>
  <div class="rich-editor">
    <QuillEditor
      ref="quillRef"
      v-model:content="innerContent"
      contentType="html"
      :options="editorOptions"
      :style="{ height: height + 'px' }"
      @update:content="handleUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.core.css'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const props = withDefaults(defineProps<{
  modelValue: string
  height?: number
  placeholder?: string
}>(), {
  height: 300,
  placeholder: '请输入内容...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const quillRef = ref()
const innerContent = ref(props.modelValue || '')

// 外部值变化时同步到内部
watch(() => props.modelValue, (val) => {
  if (val !== innerContent.value) {
    innerContent.value = val || ''
  }
})

const editorOptions = {
  placeholder: props.placeholder,
  modules: {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ align: [] }, { list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ]
  }
}

function handleUpdate(content: string) {
  innerContent.value = content || ''
  emit('update:modelValue', content || '')
}
</script>

<style scoped>
.rich-editor {
  width: 100%;
}
.rich-editor :deep(.ql-toolbar) {
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  border-color: #dcdfe6;
}
.rich-editor :deep(.ql-container) {
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  border-color: #dcdfe6;
  font-size: 14px;
}
.rich-editor :deep(.ql-editor) {
  min-height: 200px;
}
.rich-editor :deep(.ql-editor.ql-blank::before) {
  color: #a8abb2;
  font-style: normal;
}
</style>
