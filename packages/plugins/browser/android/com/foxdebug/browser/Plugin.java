package com.foxdebug.browser;

import android.content.Intent;
import com.foxdebug.browser.Browser;
import com.foxdebug.browser.BrowserActivity;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class Plugin extends CordovaPlugin {

  @Override
  public boolean execute(
    String action,
    JSONArray args,
    CallbackContext callbackContext
  ) throws JSONException {
    if (action.equals("open")) {
      String url = args.getString(0);
      JSONObject theme = args.getJSONObject(1);
      boolean onlyConsole = args.optBoolean(2, false);
      String themeString = theme.toString();
      Intent intent = new Intent(
        cordova.getActivity(),
        BrowserActivity.class
      );

      intent.putExtra("url", url);
      intent.putExtra("theme", themeString);
      intent.putExtra("onlyConsole", onlyConsole);
      cordova.getActivity().startActivity(intent);
      callbackContext.success("Opened browser");
      return true;
    } else if (action.equals("reload")) {
      Browser browser = BrowserActivity.browser;
      if (browser != null) {
        browser.webView.reload();
        callbackContext.success("Reloaded browser");
      } else {
        callbackContext.error("No active browser");
      }
      return true;
    } else if (action.equals("evaluate")) {
      Browser browser = BrowserActivity.browser;
      if (browser != null) {
        String javascript = args.getString(0);
        browser.webView.evaluateJavascript(javascript, null);
        callbackContext.success("Reloaded browser");
      } else {
        callbackContext.error("No active browser");
      }
      return true;
    } else if (action.equals("show")) {
      String url = args.getString(0);
      JSONObject theme = args.getJSONObject(1);
      boolean onlyConsole = args.optBoolean(2, false);
      String themeString = theme.toString();

      Intent intent = new Intent(
        cordova.getActivity(),
        BrowserActivity.class
      );

      Browser browser = BrowserActivity.browser;
      if (browser != null) {
        intent.putExtra("url", url);
      } else {
        intent.putExtra("url", "about:blank");
      }

      intent.putExtra("show", true);
      intent.putExtra("theme", themeString);
      intent.putExtra("onlyConsole", onlyConsole);

      cordova.getActivity().startActivity(intent);
      callbackContext.success("Opened browser");
      return true;
    }
    return false;
  }
}
