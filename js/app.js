// =================================================================
//  JavaScript for Packer & Movers Website (app.js) - FINAL VERSION
// =================================================================

// Import functions from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Import your secret keys from the other file
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase using your config
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Main Router: Runs the correct code based on the current page ---
document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split("/").pop() || "index.html";

    if (page === 'index.html' || page === 'contact.html') handleContactPage();
    if (page === 'index.html') handleIndexPage();
    if (page === 'services.html') handleServiceEnquiryPage();
    if (page === 'reviews.html') handleReviewsPage();
    if (page === 'blog.html' || page === 'blogs.html') handleBlogPage();
    if (page === 'admin.html') handleAdminPage();
    if (page === 'track.html') handleTrackingPage();
});

// --- Helper function to generate a unique tracking ID ---
function generateTrackingId() {
    const prefix = "EM";
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}${randomNumber}`;
}

// =================================================================
//  Enquiry & Form Submission Logic
// =================================================================
// FOR SERVICE QUOTES (with Tracking ID)
async function submitEnquiry(enquiryData, formElement) {
    const trackingId = generateTrackingId();
    const dataToSave = { ...enquiryData, trackingId: trackingId, status: "Booking Confirmed", timestamp: new Date() };
    try {
        await addDoc(collection(db, "enquiries"), dataToSave);
        showServicePopup(`Success! Your quote request has been sent.\nYour Tracking ID is: ${trackingId}`, 'success');
        formElement.reset();
    } catch (error) {
        console.error("Error sending enquiry: ", error);
        showToast('Error: Could not send enquiry.', 'error');
    }
}

// FOR GENERAL CONTACT MESSAGES (no Tracking ID)
function handleContactPage() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                // SAVES TO THE NEW 'contact-list' COLLECTION
                await addDoc(collection(db, "contact-list"), {
                    name: contactForm.name.value,
                    email: contactForm.email.value,
                    phone: contactForm.phone.value,
                    message: contactForm.message.value,
                    timestamp: new Date()
                });
                showToast('Thank you for your message! We will get back to you shortly.', 'success');
                contactForm.reset();
            } catch (error) {
                console.error("Error sending contact message: ", error);
                showToast('Error: Could not send message.', 'error');
            }
        });
    }
}

function handleServiceEnquiryPage() {
    const serviceForm = document.getElementById('service-enquiry-form');
    if (serviceForm) {
        serviceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const enquiryData = {
                name: serviceForm.fullName.value,
                email: serviceForm.email.value,
                phone: serviceForm.phone.value,
                movingFrom: serviceForm.movingFrom.value,
                movingTo: serviceForm.movingTo.value,
                movingDate: serviceForm.movingDate.value,
                details: serviceForm.details.value,
                type: "Detailed Quote Request"
            };
            submitEnquiry(enquiryData, serviceForm);
        });
    }
}
function handleTrackingPage() {
    const trackingForm = document.getElementById('tracking-form');
    const resultsContainer = document.getElementById('tracking-results-container');

    if (trackingForm) {
        trackingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const trackingId = document.getElementById('trackingIdInput').value.trim();
            if (!trackingId) return;

            resultsContainer.innerHTML = `<p>Searching...</p>`;
            const q = query(collection(db, "enquiries"), where("trackingId", "==", trackingId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                resultsContainer.innerHTML = `<p style="color: red;">No shipment found with this Tracking ID.</p>`;
            } else {
                let resultHTML = '';
                querySnapshot.forEach((doc) => {
                    const shipment = doc.data();
                    resultHTML += `
                        <h4>Shipment Status</h4>
                        <p><strong>Tracking ID:</strong> ${shipment.trackingId}</p>
                        <p><strong>Current Status:</strong> <span style="font-weight: bold; color: green;">${shipment.status}</span></p>
                    `;
                });
                resultsContainer.innerHTML = resultHTML;
            }
        });
    }
}
function handleReviewsPage() {
    const reviewForm = document.getElementById('review-form');
    const reviewsContainer = document.getElementById('reviews-container');

    async function displayReviews() {
        if (!reviewsContainer) return;
        reviewsContainer.innerHTML = 'Loading reviews...';
        let reviewsHTML = '';
        const q = query(collection(db, "reviews"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            reviewsContainer.innerHTML = '<p>No reviews yet. Be the first!</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const review = doc.data();
            reviewsHTML += `<div class="review-card"><h4>${review.name}</h4><p>"${review.review}"</p></div>`;
        });
        reviewsContainer.innerHTML = reviewsHTML;
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await addDoc(collection(db, "reviews"), {
                    name: document.getElementById('customerName').value,
                    review: document.getElementById('reviewText').value,
                    timestamp: new Date()
                });
                showToast('Thank you for your review!', 'success');
                reviewForm.reset();
                displayReviews();
            } catch (error) {
                showToast('Error submitting review.', 'error');
            }
        });
    }

    displayReviews();
}

// =================================================================
//  Blog Page Logic
// =================================================================
async function handleBlogPage() {
    const blogPostsContainer = document.getElementById('blog-posts-container');
    const submitBlogForm = document.getElementById('submit-blog-form');

    async function displayApprovedBlogs() {
        if (!blogPostsContainer) return;
        blogPostsContainer.innerHTML = 'Loading posts...';
        let postsHTML = '';
        const q = query(collection(db, "blogs"), where("status", "==", "approved"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            blogPostsContainer.innerHTML = '<p>No blog posts have been published yet.</p>';
        } else {
            querySnapshot.forEach((doc) => {
                const post = doc.data();
                postsHTML += `
                    <div class="blog-post">
                        <h2>${post.title}</h2>
                        <div class="blog-meta">Posted by ${post.author}</div>
                        <p>${post.content.replace(/\n/g, '<br>')}</p>
                    </div>`;
            });
            blogPostsContainer.innerHTML = postsHTML;
        }
    }

    if (submitBlogForm) {
        submitBlogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await addDoc(collection(db, "blogs"), {
                    author: document.getElementById('authorName').value,
                    title: document.getElementById('blogTitle').value,
                    content: document.getElementById('blogContent').value,
                    status: "pending",
                    timestamp: new Date()
                });
                showToast('Thank you! Your blog post has been submitted for review.', 'success');
                submitBlogForm.reset();
            } catch (error) {
                showToast('Error submitting post.', 'error');
            }
        });
    }

    displayApprovedBlogs();
}

// =================================================================
//  Index Page Logic
// =================================================================
async function handleIndexPage() {
    const latestBlogContainer = document.getElementById('latest-blog-container');
    if (!latestBlogContainer) return;

    latestBlogContainer.innerHTML = 'Loading latest post...';
    const q = query(collection(db, "blogs"), where("status", "==", "approved"), orderBy("timestamp", "desc"), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        latestBlogContainer.innerHTML = '<p>Check back later for our latest news and tips!</p>';
    } else {
        const post = querySnapshot.docs[0].data();
        latestBlogContainer.innerHTML = `
            <h3>${post.title}</h3>
            <p>${post.content.substring(0, 150)}...</p>
            <a href="blogs.html" class="read-more">Read More</a>
        `;
    }
}

// =================================================================
//  Admin Panel Logic (admin.html) - UPDATED
// =================================================================
function handleAdminPage() {
    const addBlogForm = document.getElementById('add-blog-form');
    const blogsList = document.getElementById('blogs-list');
    const enquiriesList = document.getElementById('enquiries-list');
    const reviewsList = document.getElementById('reviews-list');
    const contactListContainer = document.getElementById('contact-list-container');
    const blogCountEl = document.getElementById('blog-count');
    const enquiryCountEl = document.getElementById('enquiry-count');
    const reviewCountEl = document.getElementById('review-count');
    const contactCountEl = document.getElementById('contact-count');

    // --- Add new blog post (from admin) ---
    if (addBlogForm) {
        addBlogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await addDoc(collection(db, "blogs"), {
                    author: "Admin",
                    title: addBlogForm.title.value,
                    content: addBlogForm.content.value,
                    status: "approved",
                    timestamp: new Date()
                });
                showToast('Blog post added and published!', 'success');
                addBlogForm.reset();
                displayAdminBlogs();
                updateStats();
            } catch (error) {
                showToast('Error adding blog post.', 'error');
            }
        });
    }

    // --- Display all blogs with status and approve/delete buttons ---
    async function displayAdminBlogs() {
        if (!blogsList) return;
        blogsList.innerHTML = 'Loading blogs...';
        let blogsHTML = '';
        const q = query(collection(db, "blogs"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const blog = doc.data();
            const docId = doc.id;
            blogsHTML += `
                <div class="list-item" style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
                    <p><strong>Title:</strong> ${blog.title}</p>
                    <p><strong>Author:</strong> ${blog.author}</p>
                    <p><strong>Status:</strong> <span style="font-weight: bold; color: ${blog.status === 'approved' ? 'green' : 'orange'};">${blog.status}</span></p>
                    <div>
                        ${blog.status === 'pending' ? `<button class="approve-btn" data-id="${docId}">Approve</button>` : ''}
                        <button class="delete-btn" data-collection="blogs" data-id="${docId}">Delete</button>
                    </div>
                </div>`;
        });
        blogsList.innerHTML = blogsHTML || '<p>No blogs submitted yet.</p>';
    }

    // --- Display all QUOTE enquiries with full details ---
    async function displayEnquiries() {
        if (!enquiriesList) return;
        enquiriesList.innerHTML = 'Loading enquiries...';
        let enquiriesHTML = '';
        const q = query(collection(db, "enquiries"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const enquiry = doc.data();
            const docId = doc.id;
            // Build the detailed view for each enquiry
            enquiriesHTML += `
                <div class="list-item" style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
                    <p><strong>Tracking ID:</strong> ${enquiry.trackingId}</p>
                    <p><strong>Name:</strong> ${enquiry.name}</p>
                    <p><strong>Email:</strong> ${enquiry.email}</p>
                    <p><strong>Phone:</strong> ${enquiry.phone}</p>
                    <p><strong>Moving From:</strong> ${enquiry.movingFrom}</p>
                    <p><strong>Moving To:</strong> ${enquiry.movingTo}</p>
                    <p><strong>Preferred Date:</strong> ${enquiry.movingDate}</p>
                    <p><strong>Details:</strong> ${enquiry.details}</p>
                    <hr>
                    <p><strong>Current Status:</strong> ${enquiry.status}</p>
                    <div class="update-form-container">
                        <input type="text" id="status-input-${docId}" placeholder="Enter new status">
                        <button class="update-status-btn" data-id="${docId}">Update Status</button>
                        <button class="delete-btn" data-collection="enquiries" data-id="${docId}">Delete</button>
                    </div>
                </div>`;
        });
        enquiriesList.innerHTML = enquiriesHTML || '<p>No quote enquiries received yet.</p>';
    }

    // --- Display all REVIEWS ---
    async function displayAdminReviews() {
        if (!reviewsList) return;
        reviewsList.innerHTML = 'Loading reviews...';
        let reviewsHTML = '';
        const q = query(collection(db, "reviews"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            reviewsList.innerHTML = '<p>No reviews submitted yet.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const review = doc.data();
            const docId = doc.id;
            reviewsHTML += `
                <div class="list-item" style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
                    <p><strong>${review.name}:</strong> "${review.review}"</p>
                    <button class="delete-btn" data-collection="reviews" data-id="${docId}">Delete</button>
                </div>`;
        });
        reviewsList.innerHTML = reviewsHTML;
    }

    // --- Display all CONTACT MESSAGES ---
    async function displayContactList() {
        if (!contactListContainer) return;
        contactListContainer.innerHTML = 'Loading messages...';
        let contactsHTML = '';
        const q = query(collection(db, "contact-list"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const contact = doc.data();
            const docId = doc.id;
            contactsHTML += `
                <div class="list-item" style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px;">
                    <p><strong>Name:</strong> ${contact.name}</p>
                    <p><strong>Email:</strong> ${contact.email}</p>
                    <p><strong>Phone:</strong> ${contact.phone}</p>
                    <p><strong>Message:</strong> ${contact.message}</p>
                    <button class="delete-btn" data-collection="contact-list" data-id="${docId}">Delete</button>
                </div>`;
        });
        contactListContainer.innerHTML = contactsHTML || '<p>No contact messages received yet.</p>';
    }

    // --- Function to update the stat cards ---
    async function updateStats() {
        try {
            const blogsSnapshot = await getDocs(collection(db, "blogs"));
            const enquiriesSnapshot = await getDocs(collection(db, "enquiries"));
            const reviewsSnapshot = await getDocs(collection(db, "reviews"));
            const contactsSnapshot = await getDocs(collection(db, "contact-list"));

            if (blogCountEl) blogCountEl.textContent = blogsSnapshot.size;
            if (enquiryCountEl) enquiryCountEl.textContent = enquiriesSnapshot.size;
            if (reviewCountEl) reviewCountEl.textContent = reviewsSnapshot.size;
            if (contactCountEl) contactCountEl.textContent = contactsSnapshot.size;
        } catch (error) {
            console.error("Error updating stats: ", error);
        }
    }

    // --- Main event listener for all admin buttons ---
    document.querySelector('.admin-main').addEventListener('click', async (e) => {
        if (e.target.classList.contains('update-status-btn')) {
            const docId = e.target.dataset.id;
            const newStatus = document.getElementById(`status-input-${docId}`).value;
            if (newStatus && docId) {
                await updateDoc(doc(db, "enquiries", docId), { status: newStatus });
                showToast('Status updated!', 'success');
                displayEnquiries();
            }
        }
        
        if (e.target.classList.contains('approve-btn')) {
            const docId = e.target.dataset.id;
            if (docId) {
                await updateDoc(doc(db, "blogs", docId), { status: "approved" });
                showToast('Blog post approved and published!', 'success');
                displayAdminBlogs();
            }
        }

        if (e.target.classList.contains('delete-btn')) {
            const docId = e.target.dataset.id;
            const collectionName = e.target.dataset.collection;
            try {
                await deleteDoc(doc(db, collectionName, docId));
                showToast('Item deleted successfully!', 'success');
                if (collectionName === 'enquiries') displayEnquiries();
                if (collectionName === 'reviews') displayAdminReviews();
                if (collectionName === 'blogs') displayAdminBlogs();
                if (collectionName === 'contact-list') displayContactList();
                updateStats();
            } catch (error) {
                showToast('Error: Could not delete item.', 'error');
            }
        }
    });

    // Load all data for the admin panel
    displayEnquiries();
    displayAdminReviews();
    displayAdminBlogs();
    displayContactList();
    updateStats();
}

// --- Toast Notification Function ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    toast.textContent = message;
    toast.className = 'toast-notification show ' + type; // Add 'show' and type class

    // Hide the toast after 3 seconds
    setTimeout(() => {
        toast.className = 'toast-notification'; // Remove 'show' class to hide
    }, 3000);
}

        // Services popup functionality
    function showServicePopup(message) {
        const popup = document.getElementById('service-popup');
        document.getElementById('popup-message').textContent = message;
        popup.style.display = 'block';
    }

    // Close popup handler
    document.querySelector('.close-popup').addEventListener('click', function() {
        document.getElementById('service-popup').style.display = 'none';
    });