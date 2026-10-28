package com.example.todo.services;

import com.example.todo.configurations.TodoConfigurationProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import lombok.NonNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.web.util.WebUtils;

@Service
public class SessionCookieService {
  private final TodoConfigurationProperties.Cookie cookieConfiguration;
  private final int expiry;

  public SessionCookieService(TodoConfigurationProperties configurationProperties) {
    this.cookieConfiguration = configurationProperties.getCookie();
    this.expiry = configurationProperties.getJwt().getExpiry();
  }

  private ResponseCookie createSessionCookie(@NonNull String value, int expiry) {
    return ResponseCookie.from(cookieConfiguration.getName(), value)
        .httpOnly(cookieConfiguration.isHttpOnly())
        .path(cookieConfiguration.getPath())
        .maxAge(expiry)
        .sameSite(cookieConfiguration.getSameSite())
        .secure(cookieConfiguration.isSecure())
        .build();
  }

  public void generateSessionCookie(@NonNull HttpServletResponse response, @NonNull String value) {
    response.setHeader(HttpHeaders.SET_COOKIE, createSessionCookie(value, expiry).toString());
  }

  public void deleteSessionCookie(@NonNull HttpServletResponse response) {
    response.setHeader(HttpHeaders.SET_COOKIE, createSessionCookie("", 0).toString());
  }

  public Optional<Cookie> getSessionCookie(@NonNull HttpServletRequest request) {
    return Optional.ofNullable(WebUtils.getCookie(request, cookieConfiguration.getName()));
  }
}
