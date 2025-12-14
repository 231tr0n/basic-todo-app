package com.example.todo.services;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.WebUtils;

@Service
public class SessionCookieService {
  private final String sessionCookieName;
  private final int expiry;

  public SessionCookieService(
      @NonNull @Value("${cookie.name:token}") String sessionCookieName,
      @Value("${jwt.expiry}") int expiry) {
    this.sessionCookieName = sessionCookieName;
    this.expiry = expiry;
  }

  public Cookie generateSessionCookie(String value) {
    Cookie cookie = new Cookie(sessionCookieName, value);
    cookie.setMaxAge(expiry);
    return cookie;
  }

  public Cookie deleteSessionCookie() {
    Cookie cookie = new Cookie(sessionCookieName, "");
    cookie.setMaxAge(0);
    return cookie;
  }

  public Cookie getSessionCookie(HttpServletRequest request) {
    return WebUtils.getCookie(request, sessionCookieName);
  }
}
