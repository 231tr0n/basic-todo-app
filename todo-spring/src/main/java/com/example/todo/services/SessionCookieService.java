package com.example.todo.services;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.WebUtils;

@Service
@AllArgsConstructor
public class SessionCookieService {

  @Value("${cookie.name:token}")
  @NonNull
  private final String cookieName;

  @Value("${jwt.expiry:86400}")
  private final int maxAge;

  public Cookie generateSessionCookie(String value) {
    Cookie cookie = new Cookie(cookieName, value);
    cookie.setMaxAge(maxAge);
    return cookie;
  }

  public Cookie deleteSessionCookie() {
    Cookie cookie = new Cookie(cookieName, "");
    cookie.setMaxAge(0);
    return cookie;
  }

  public Cookie getSessionCookie(HttpServletRequest request) {
    return WebUtils.getCookie(request, cookieName);
  }
}
