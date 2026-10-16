const { test, expect } = require('@playwright/test');

// 2026-10-16: khung "Thông tin đơn hàng" theo thiết kế giỏ hàng (templates/cart.bwt).
test('khung đơn hàng: voucher điền vào ô, tổng + phí vận chuyển + số SP cập nhật khi đổi giỏ', async ({ page }) => {
  await page.context().clearCookies();
  await page.request.post('/cart/add.js', { form: { quantity: '1', variantId: '10041' } }); // 280.000
  await page.request.post('/cart/add.js', { form: { quantity: '1', variantId: '10031' } }); // 480.000
  await page.goto('/cart');

  const sum = page.locator('.col-cart-right .ajaxcart__footer');
  await expect(sum.locator('.checkout-header')).toHaveText('Thông tin đơn hàng');
  await expect(page.locator('[data-cart-count]')).toHaveText('2 sản phẩm');
  await expect(sum.locator('[data-cart-shipping-value]')).toContainText('Miễn phí'); // ≥ free_shipping_price 500.000
  await expect(sum.locator('[data-cart-total]')).toContainText('760');
  await expect(sum.locator('.cart-trust-item')).toHaveCount(4);
  await expect(page.locator('.col-cart-left > .cart-continue-link')).toHaveAttribute('href', '/collections/all');

  // Voucher: bấm mã ⇒ điền vào ô + hiện mô tả ưu đãi.
  const chip = sum.locator('.js-coupon-chip').first();
  const code = await chip.getAttribute('data-code');
  await chip.click();
  await expect(sum.locator('#coupon-code-input')).toHaveValue(code);
  await expect(sum.locator('.coupon-feedback')).not.toBeEmpty();

  // Xoá SP 480.000 ⇒ tổng 280.000 < 500.000 ⇒ báo số tiền còn thiếu để được miễn phí.
  await page.locator('.CartPageContainer .remove-item-cart').nth(1).click();
  await expect(sum.locator('[data-cart-total]')).toContainText('280');
  await expect(sum.locator('[data-cart-shipping-value]')).toContainText('Mua thêm');
  await expect(page.locator('[data-cart-count]')).toHaveText('1 sản phẩm');
});
