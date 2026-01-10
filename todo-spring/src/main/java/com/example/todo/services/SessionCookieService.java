package com.example.todo.services;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
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

  private ResponseCookie createSessionCookie(String value, int expiry) {
    return ResponseCookie.from(sessionCookieName, value)
        .httpOnly(true)
        .path("/")
        .maxAge(expiry)
        .sameSite("Strict")
        .httpOnly(true)
        .secure(false)
        .build();
  }

  public void generateSessionCookie(HttpServletResponse response, String value) {
    response.setHeader(HttpHeaders.SET_COOKIE, createSessionCookie(value, expiry).toString());
  }

  public void deleteSessionCookie(HttpServletResponse response) {
    response.setHeader(HttpHeaders.SET_COOKIE, createSessionCookie("", 0).toString());
  }

  public Cookie getSessionCookie(HttpServletRequest request) {
    return WebUtils.getCookie(request, sessionCookieName);
  }
}
