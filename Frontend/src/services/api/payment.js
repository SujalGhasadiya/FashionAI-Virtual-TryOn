import API from '../axios';

// Get all subscription plans
export const getSubscriptionPlans = () => {
  console.log('[Payment API] Fetching subscription plans from /plans');
  return API.get('/plans');
};

// Create Razorpay payment order
export const createPaymentOrder = (planCode) => {
  console.log('[Payment API] Creating payment order for plan:', planCode);
  return API.post('/payments/razorpay/order', {
    plan_code: planCode,
  });
};

// Verify Razorpay payment
export const verifyPayment = (planCode, razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  console.log('[Payment API] Verifying payment with order:', razorpayOrderId);
  return API.post('/payments/razorpay/verify', {
    plan_code: planCode,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });
};

// Purchase subscription (activate plan directly, only for free plans)
export const purchaseSubscription = (planCode) => {
  console.log('[Payment API] Purchasing subscription for plan:', planCode);
  return API.post(`/me/subscription/${planCode}`);
};
