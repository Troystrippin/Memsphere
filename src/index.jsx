import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";

// Add meta tags to remove black bar at the top
const addMetaTags = () => {
  // Remove any existing viewport meta tags first
  const existingViewport = document.querySelector('meta[name="viewport"]');
  if (existingViewport) {
    existingViewport.remove();
  }

  // Add new viewport meta tag with viewport-fit=cover
  const viewport = document.createElement("meta");
  viewport.name = "viewport";
  viewport.content =
    "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";
  document.head.appendChild(viewport);

  // Remove any existing theme-color meta tags
  const existingThemeColor = document.querySelector('meta[name="theme-color"]');
  if (existingThemeColor) {
    existingThemeColor.remove();
  }

  // Add theme color meta tag
  const themeColor = document.createElement("meta");
  themeColor.name = "theme-color";
  themeColor.content = "#f3f4f6";
  document.head.appendChild(themeColor);

  // Add status-bar-style for iOS
  const statusBar = document.createElement("meta");
  statusBar.name = "apple-mobile-web-app-status-bar-style";
  statusBar.content = "black-translucent";
  document.head.appendChild(statusBar);

  // Add apple-mobile-web-app-capable
  const appleCapable = document.createElement("meta");
  appleCapable.name = "apple-mobile-web-app-capable";
  appleCapable.content = "yes";
  document.head.appendChild(appleCapable);
};

// Call the function to add meta tags
addMetaTags();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
