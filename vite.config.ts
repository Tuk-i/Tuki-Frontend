import { defineConfig } from "vite";
import { resolve } from "path";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),

        // Auth
        login: resolve(__dirname, "src/pages/auth/login/login.html"),
        register: resolve(__dirname, "src/pages/auth/register/register.html"),

        // Admin
        adminHome: resolve(__dirname, "src/pages/admin/home/home.html"),
        adminOrders: resolve(__dirname, "src/pages/admin/orders/orders.html"),
        adminProducts: resolve(__dirname, "src/pages/admin/products/products.html"),
        adminCategories: resolve(__dirname, "src/pages/admin/categories/categories.html"),

        // Client
        clientHome: resolve(__dirname, "src/pages/store/home/home.html"),
        clientOrders: resolve(__dirname, "src/pages/client/orders/orders.html"),

        // Store
        storeCart: resolve(__dirname, "src/pages/store/cart/cart.html"),
        storeHome: resolve(__dirname, "src/pages/store/home/home.html"),
        storeProductDetail: resolve(__dirname, "src/pages/store/productDetail/productDetail.html"),
      },

    },
  },
  base: "./",
});