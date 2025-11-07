// ===== CONFIGURATION =====
// Replace this with your actual API Gateway URL after AWS setup
const API_ENDPOINT = 'https://jhmayy6zlk.execute-api.ap-southeast-2.amazonaws.com/prod/products'; // You'll get this after setting up AWS

// ===== QUANTITY MANAGEMENT =====
function changeQuantity(productId, change) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    let currentQty = parseInt(qtyInput.value);
    let newQty = currentQty + change;

    // Ensure quantity is between 1 and 50
    if (newQty >= 1 && newQty <= 50) {
        qtyInput.value = newQty;
    }
}

// ===== BUY PRODUCT =====
async function buyProduct(productId, productName, pricePerKg) {
    const quantity = parseInt(document.getElementById(`qty-${productId}`).value);
    const totalPrice = quantity * pricePerKg;

    // Track the purchase in AWS
    await trackPurchase(productId, productName, quantity, totalPrice);

    // Show confirmation modal
    const modal = document.getElementById('purchaseModal');
    const message = document.getElementById('modalMessage');
    message.innerHTML = `
    <strong>${quantity} kg of ${productName}</strong> purchased successfully!<br>
    Total: <strong>₹${totalPrice}</strong><br><br>
    Your fresh ${productName.toLowerCase()} will be delivered to your home within 24 hours! 🚚
  `;
    modal.classList.add('show');

    // Reset quantity to 1
    document.getElementById(`qty-${productId}`).value = 1;

    // Reload products to update the order
    await loadProducts();
}

// ===== CLOSE MODAL =====
function closeModal() {
    const modal = document.getElementById('purchaseModal');
    modal.classList.remove('show');
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('purchaseModal');
    if (event.target === modal) {
        closeModal();
    }
}

// ===== TRACK PURCHASE IN AWS =====
async function trackPurchase(productId, productName, quantity, totalPrice) {
    try {
        // Generate a unique user session ID (stored in localStorage)
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }

        const purchaseData = {
            action: 'trackPurchase',
            productId: productId,
            productName: productName,
            quantity: quantity,
            totalPrice: totalPrice,
            userId: userId,
            timestamp: new Date().toISOString()
        };

        console.log('Tracking purchase:', purchaseData);

        // Send data to AWS Lambda via API Gateway
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(purchaseData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Purchase tracked successfully:', result);
        } else {
            console.error('Error tracking purchase:', response.statusText);
        }
    } catch (error) {
        console.error('Error sending data to AWS:', error);
        // Continue with purchase even if tracking fails
    }
}

// ===== LOAD AND SORT PRODUCTS FROM AWS =====
async function loadProducts() {
    try {
        console.log('Loading products from AWS...');

        // Fetch sorted products from AWS
        const response = await fetch(`${API_ENDPOINT}?action=getProducts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Products loaded:', data);

            // Sort products based on popularity (total quantity purchased)
            if (data.products && data.products.length > 0) {
                sortProductsOnPage(data.products);
            }
        } else {
            console.log('Using default product order (AWS not configured yet)');
        }
    } catch (error) {
        console.error('Error loading products from AWS:', error);
        console.log('Using default product order');
    }
}

// ===== SORT PRODUCTS ON PAGE =====
function sortProductsOnPage(products) {
    const productGrid = document.getElementById('productGrid');
    const productCards = Array.from(productGrid.children);

    // Create a map of product IDs to their popularity scores
    const popularityMap = {};
    products.forEach(product => {
        popularityMap[product.productId] = product.totalQuantity || 0;
    });

    // Sort product cards based on popularity
    productCards.sort((a, b) => {
        const idA = a.getAttribute('data-product-id');
        const idB = b.getAttribute('data-product-id');
        const popularityA = popularityMap[idA] || 0;
        const popularityB = popularityMap[idB] || 0;
        return popularityB - popularityA; // Sort descending (most popular first)
    });

    // Re-append sorted cards to the grid
    productCards.forEach(card => {
        productGrid.appendChild(card);
    });

    console.log('Products sorted by popularity!');
}

// ===== TRACK PAGE VIEW =====
async function trackPageView() {
    try {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }

        const viewData = {
            action: 'trackPageView',
            userId: userId,
            timestamp: new Date().toISOString()
        };

        await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(viewData)
        });

        console.log('Page view tracked');
    } catch (error) {
        console.error('Error tracking page view:', error);
    }
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', function () {
    console.log('FreshHarvest website loaded!');

    // Track page view
    trackPageView();

    // Load and sort products based on AWS data
    loadProducts();

    console.log('Ready to track purchases! Set up AWS to enable cloud tracking.');
});
