import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, ShieldCheck, Truck, RefreshCw, MessageSquarePlus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import ProductCard from '../components/ProductCard';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { token, user } = useAuth();
  const { showToast } = useUI();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive variables
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');
  const [addingCart, setAddingCart] = useState(false);
  
  // Review form states
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      // Include session_id for browsing tracking
      const sessId = localStorage.getItem('sessionId');
      const url = `/api/products/${id}?session_id=${sessId}`;
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error("Product not found");
      }
      const data = await res.json();
      setProduct(data);
      setSelectedImage(data.images && data.images.length > 0 ? data.images[0] : '');

      // Fetch Reviews
      const revRes = await fetch(`/api/products/${id}/reviews`);
      if (revRes.ok) {
        const revData = await revRes.json();
        setReviews(revData);
      }

      // Fetch Related
      const relRes = await fetch(`/api/recommendations/related/${id}?limit=4`);
      if (relRes.ok) {
        const relData = await relRes.json();
        setRelated(relData);
      }
    } catch (err) {
      console.error(err);
      navigate('/shop');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
    setQuantity(1); // reset quantity on product swap
  }, [id, token]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingCart(true);
    try {
      await addToCart(product.id, quantity);
      showToast("Added to cart!", "success");
    } catch (err) {
      showToast("Error adding item to cart. Please check stock limit.", "error");
    } finally {
      setAddingCart(false);
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }
    
    if (user?.role !== 'customer') {
      showToast("Only customers can leave reviews.", "warning");
      return;
    }
 
    if (!newComment.trim()) {
      showToast("Please enter a review comment.", "warning");
      return;
    }
 
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: newRating, comment: newComment })
      });
      if (res.ok) {
        setNewComment('');
        showToast("Review submitted successfully!", "success");
        // Refresh details
        fetchProductDetails();
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to submit review.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred submitting review.", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-slate-200 dark:bg-slate-800 rounded-3xl aspect-[4/3]"></div>
          <div className="space-y-6 text-left py-6">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-2/3"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3"></div>
            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-lg w-full"></div>
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const hasDiscount = product.discount_price !== null && product.discount_price !== undefined;
  const currentPrice = hasDiscount ? product.discount_price : product.price;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16 animate-fade-in-up">
      
      {/* Product Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        
        {/* Images Column */}
        <div className="space-y-4">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40">
            <img
              src={selectedImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 aspect-square rounded-xl overflow-hidden border-2 shrink-0 ${selectedImage === img ? 'border-violet-600' : 'border-transparent'}`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Column */}
        <div className="text-left space-y-6">
          <div className="space-y-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-violet-500">{product.brand}</span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight margin-0">{product.name}</h1>
            <p className="text-sm text-slate-400 font-semibold">{product.title}</p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex text-amber-400">
              <Star className="h-4.5 w-4.5 fill-current" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{product.rating || '4.5'}</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-400 font-semibold">{reviews.length} Customer Reviews</span>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Description */}
          <div className="space-y-2 text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed">
            <p>{product.description}</p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            {hasDiscount ? (
              <>
                <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">₹{product.discount_price.toFixed(2)}</span>
                <span className="text-sm line-through text-slate-400">₹{product.price.toFixed(2)}</span>
                <span className="text-xs text-rose-500 font-extrabold uppercase">Save ₹{(product.price - product.discount_price).toFixed(2)}</span>
              </>
            ) : (
              <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">₹{product.price.toFixed(2)}</span>
            )}
          </div>

          {/* Seller / Stock */}
          <div className="text-xs text-slate-500 font-medium space-y-1">
            <p>Seller: <span className="text-violet-500 font-semibold">{product.seller_name}</span></p>
            <p>SKU: <span className="font-semibold">{product.SKU}</span></p>
            <p>Status: <span className={`font-semibold capitalize ${product.availability_status === 'out_of_stock' ? 'text-rose-500' : 'text-emerald-500'}`}>{product.availability_status.replace('_', ' ')}</span></p>
          </div>

          {/* Quantity and Cart buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-full overflow-hidden bg-slate-50 dark:bg-slate-900 h-12">
              <button
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
                disabled={product.availability_status === 'out_of_stock'}
              >
                -
              </button>
              <span className="px-4 text-sm font-extrabold text-slate-800 dark:text-slate-200">{quantity}</span>
              <button
                onClick={() => setQuantity(prev => Math.min(product.stock_count, prev + 1))}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
                disabled={product.availability_status === 'out_of_stock'}
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.availability_status === 'out_of_stock' || addingCart}
              className="flex-1 md:flex-initial px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold text-sm shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2 hover:scale-102 transition-all"
            >
              <ShoppingCart className="h-4.5 w-4.5" />
              Add to Cart
            </button>
          </div>

          {/* Service Promises */}
          <div className="grid grid-cols-3 gap-2 pt-6 text-[10px] sm:text-xs font-bold text-slate-500 border-t border-slate-100 dark:border-slate-900">
            <div className="flex items-center gap-1.5 justify-center md:justify-start">
              <ShieldCheck className="h-4.5 w-4.5 text-violet-500" />
              <span>Secure Checkout</span>
            </div>
            <div className="flex items-center gap-1.5 justify-center md:justify-start">
              <Truck className="h-4.5 w-4.5 text-violet-500" />
              <span>Fast Shipping</span>
            </div>
            <div className="flex items-center gap-1.5 justify-center md:justify-start">
              <RefreshCw className="h-4.5 w-4.5 text-violet-500" />
              <span>Easy Returns</span>
            </div>
          </div>

        </div>
      </div>

      {/* Reviews Section */}
      <section className="text-left space-y-8 border-t border-slate-200 dark:border-slate-800 pt-12">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Customer Reviews</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Write a Review */}
          <div className="lg:col-span-1 glass p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 space-y-4">
            <h3 className="font-extrabold text-base flex items-center gap-1.5">
              <MessageSquarePlus className="h-4.5 w-4.5 text-violet-500" />
              Leave a Review
            </h3>
            {token ? (
              user?.role === 'customer' ? (
                <form onSubmit={handleAddReview} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Rating</label>
                    <select
                      value={newRating}
                      onChange={(e) => setNewRating(parseInt(e.target.value))}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="5">5 Stars ★★★★★</option>
                      <option value="4">4 Stars ★★★★☆</option>
                      <option value="3">3 Stars ★★★☆☆</option>
                      <option value="2">2 Stars ★★☆☆☆</option>
                      <option value="1">1 Star ★☆☆☆☆</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Comment</label>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows="3"
                      placeholder="Write your experience..."
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-2.5 rounded-full bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 shadow-md"
                  >
                    Submit Review
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-400 italic">Only shoppers can leave reviews.</p>
              )
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed">
                Please <Link to="/login" className="text-violet-600 font-bold hover:underline">sign in</Link> as a shopper to write a review.
              </p>
            )}
          </div>

          {/* Reviews list */}
          <div className="lg:col-span-2 space-y-4 max-h-[360px] overflow-y-auto pr-2">
            {reviews.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-6">No reviews yet for this product. Be the first to share your thoughts!</p>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="p-5 bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 text-left">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{rev.user_name}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{new Date(rev.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex text-amber-400 text-xs mt-1.5">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm mt-3 leading-relaxed">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Related Products */}
      <section className="text-left space-y-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Related Products</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {related.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      </section>

    </div>
  );
}
