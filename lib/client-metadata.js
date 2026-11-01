/**
 * 平台接口要求的三件 client metadata（version/locale/timezoneOffsetSeconds）本是 UI 身份。
 * 命令 handler 在宿主侧执行，拿不到 UI 的版本与语言，这里改用宿主自己的运行时取值：
 * 版本由调用方从 APP_IDENTITY 传入，语言取进程 locale，时区取当前偏移。
 * 语义偏差只影响平台侧的日志与文案语言，不影响余额数值。
 */

/**
 * @param input.version - 构建版本，由调用方从 APP_IDENTITY 取
 * @param input.locale - 覆盖用语言；缺省取进程 locale
 * @param input.now - 取当前时间的注入点
 * @returns 平台接口所需的 client metadata
 */
export function clientMetadata({ version, locale, now = () => new Date() } = {}) {
  return {
    version,
    locale: locale ?? Intl.DateTimeFormat().resolvedOptions().locale,
    // getTimezoneOffset() 返回“UTC 减本地”的分钟数，西半球为正，故取负。
    timezoneOffsetSeconds: -now().getTimezoneOffset() * 60,
  }
}
