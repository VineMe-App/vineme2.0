export interface RouterLike {
  back: () => void;
  replace: (href: string) => void;
  canGoBack?: () => boolean;
}

/**
 * Safely navigate back; if there is no history stack, route to fallback instead.
 */
export const safeGoBack = (
  router: RouterLike,
  fallbackRoute: string = '/(tabs)'
) => {
  try {
    if (router?.canGoBack && router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute);
    }
  } catch (error) {
    router.replace(fallbackRoute);
  }
};
