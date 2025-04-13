export interface Post {
  id: string;
  slug: string;
  body: string;
  collection: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    updatedDate?: Date;
    emoji: string;
    slug?: string;
    hiddenWishlist?: boolean;
    hidePubDate?: boolean;
  };
}
