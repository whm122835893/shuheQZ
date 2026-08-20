import { ref, onUnmounted } from 'vue'

export function useCountdown(seconds = 60) {
  const countdown = ref(0)
  const text = ref('获取验证码')
  let timer = null

  function start() {
    if (countdown.value > 0) return
    countdown.value = seconds
    text.value = `${countdown.value}s`
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
        timer = null
        text.value = '获取验证码'
      } else {
        text.value = `${countdown.value}s`
      }
    }, 1000)
  }

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { countdown, text, start }
}
