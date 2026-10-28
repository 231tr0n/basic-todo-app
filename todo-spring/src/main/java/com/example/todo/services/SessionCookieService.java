package com.example.todo.services;

import com.example.todo.configurations.TodoConfigurationProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.web.util.WebUtils;

@Service
@RequiredArgsConstructor
public class SessionCookieService {
  private final TodoConfigurationProperties configurationProperties;

  private ResponseCookie createSessionCookie(String value, int expiry) {
    return ResponseCookie.from(configurationProperties.getCookie().getName(), value)
        .httpOnly(configurationProperties.getCookie().isHttpOnly())
        .path(configurationProperties.getCookie().getPath())
        .maxAge(expiry)
        .sameSite(configurationProperties.getCookie().getSameSite())
        .secure(configurationProperties.getCookie().isSecure())
        .build();
  }

  public void generateSessionCookie(@NonNull HttpServletResponse response, @NonNull String value) {
    response.setHeader(
        HttpHeaders.SET_COOKIE,
        createSessionCookie(value, configurationProperties.getJwt().getExpiry()).toString());
  }

  public void deleteSessionCookie(@NonNull HttpServletResponse response) {
    response.setHeader(HttpHeaders.SET_COOKIE, createSessionCookie("", 0).toString());
  }

  public Optional<Cookie> getSessionCookie(@NonNull HttpServletRequest request) {
    return Optional.ofNullable(
        WebUtils.getCookie(request, configurationProperties.getCookie().getName()));
  }
}
