import mongoose from 'mongoose';

const FeatureSchema = new mongoose.Schema({
  emoji: { type: String, default: '' },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
}, { _id: false });

const GalleryImageSchema = new mongoose.Schema({
  url: { type: String, default: '' },
  alt: { type: String, default: '' },
}, { _id: false });

const ReviewSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  text: { type: String, default: '' },
  stars: { type: Number, default: 5, min: 1, max: 5 },
}, { _id: false });

const TabSchema = new mongoose.Schema({
  paragraph: { type: String, default: '' },
  bullets: { type: [String], default: [] },
  note: { type: String, default: '' },
}, { _id: false });

const HighlightSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
}, { _id: false });

const SiteContentSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  property_name: { type: String, default: '' },
  hero_title: { type: String, default: '' },
  hero_subtitle: { type: String, default: '' },
  hero_badge: { type: String, default: '' },
  hero_image_url: { type: String, default: '' },
  book_url: { type: String, default: '' },
  features: { type: [FeatureSchema], default: [] },
  gallery: { type: [GalleryImageSchema], default: [] },
  amenities: { type: [String], default: [] },
  good_to_know: { type: [String], default: [] },
  badge_title: { type: String, default: '' },
  badge_description: { type: String, default: '' },
  rating_value: { type: Number, default: 0 },
  reviews_count: { type: Number, default: 0 },
  host_line: { type: String, default: '' },
  show_superhost_pill: { type: Boolean, default: false },
  show_top_percent_pill: { type: Boolean, default: false },
  highlights: { type: [HighlightSchema], default: [] },
  reviews: { type: [ReviewSchema], default: [] },
  details_tabs: {
    home: { type: TabSchema, default: () => ({}) },
    area: { type: TabSchema, default: () => ({}) },
    value: { type: TabSchema, default: () => ({}) },
  },
}, { timestamps: true, collection: 'site_contents' });

const SiteContent = mongoose.models.SiteContent || mongoose.model('SiteContent', SiteContentSchema);

export default SiteContent;

