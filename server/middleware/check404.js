module.exports = async function checkApi404(ctx, next) {
  const apiRegex = /^\/api/i
  if (apiRegex.test(ctx.path) !== true) {
    await next()
  }
}
