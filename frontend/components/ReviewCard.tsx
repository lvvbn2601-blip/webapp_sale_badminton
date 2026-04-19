import { Review } from "../types";
import { Check, ThumbsUp, Star } from "lucide-react";
import { useState } from "react";

export function ReviewCard({ review }: { review: Review }) {
  const [helpfulClicked, setHelpfulClicked] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);

  const handleHelpful = () => {
    if (helpfulClicked) {
      setHelpfulCount(c => Math.max(0, c - 1));
      setHelpfulClicked(false);
    } else {
      setHelpfulCount(c => c + 1);
      setHelpfulClicked(true);
    }
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white/80 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold">
            {typeof review.user === 'string' ? review.user.charAt(0) : review.user?.name?.charAt(0) || "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-secondary">{typeof review.user === 'string' ? review.user : review.user?.name || "Unknown"}</span>
              {review.verified !== false && (
                <span className="flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  <Check size={10} strokeWidth={3} />
                  Verified
                </span>
              )}
            </div>
            <div className="text-xs text-secondary/50 mt-0.5">{review.date.slice(0, 10)}</div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={14}
              className={s <= review.rating ? "text-amber-400" : "text-gray-200"}
              fill={s <= review.rating ? "currentColor" : "none"}
            />
          ))}
        </div>
      </div>

      {review.title && (
        <h4 className="mt-4 font-bold text-secondary">{review.title}</h4>
      )}
      <div className={`text-sm text-secondary/80 leading-relaxed ${review.title ? "mt-1" : "mt-4"}`}>
        <p>{review.comment}</p>

        {((review.images && review.images.length > 0) || (review.videos && review.videos.length > 0)) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {review.images?.map((url, i) => (
              <img key={`img-${i}`} src={url} alt="Review image" className="h-16 w-16 rounded-lg object-cover border border-black/5" />
            ))}
            {review.videos?.map((url, i) => (
              <video key={`vid-${i}`} src={url} controls className="h-16 w-auto max-w-[120px] rounded-lg object-cover border border-black/5 bg-black" />
            ))}
          </div>
        )}

        {review.adminReply && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white grid place-items-center shadow-md group-hover:scale-105 transition-transform">
                <span className="font-bold text-sm">B</span>
              </div>
              <span className="font-bold text-primary">Shop Reply</span>
              <span className="text-xs text-secondary/50">{review.adminReplyAt.slice(0, 10)}</span>
            </div>
            <p className="text-sm text-secondary/80">{review.adminReply}</p>
          </div>
        )}
      </div>

      {review.tags && review.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-secondary/60">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center">
        <button
          onClick={handleHelpful}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition border ${helpfulClicked
            ? "border-primary bg-primary/5 text-primary"
            : "border-black/10 bg-transparent text-secondary/60 hover:bg-gray-50"
            }`}
        >
          <ThumbsUp size={14} className={helpfulClicked ? "fill-current" : ""} />
          {helpfulClicked ? "Helpful" : "Helpful?"} ({helpfulCount})
        </button>
      </div>
    </div>
  );
}
