import {onMounted, getCurrentInstance } from 'vue'
export function useAsyncComp() {
  const instance = getCurrentInstance();
  if (!instance) throw new Error('Hook must be used within a setup function');

  const emit = (event: string, ...args: any[]) => {
    if (instance) {
      instance.emit(event, ...args);
    }
  };

  onMounted(() => {
    console.log('useAsyncComp mounted');
    emit('compLoaded');
  });
} 