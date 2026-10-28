package com.example.todo.components;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.example.todo.repositories.UserRepository;
import com.example.todo.services.JwtService;
import com.example.todo.services.SessionCookieService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@AllArgsConstructor
public class JwtAuthenticationFilterComponent extends OncePerRequestFilter {
  private final JwtService jwtService;
  private final UserRepository userRepository;
  private final SessionCookieService sessionCookieService;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws IOException, ServletException {
    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      authenticate(request, response);
    }
    filterChain.doFilter(request, response);
  }

  private void authenticate(HttpServletRequest request, HttpServletResponse response) {
    Cookie cookie = sessionCookieService.getSessionCookie(request).orElse(null);
    if (cookie == null) return;
    try {
      String username = jwtService.decodeJwt(cookie.getValue());
      userRepository
          .findByUsernameAndFetchAuthorities(username)
          .filter(user -> user.isEnabled() && !user.isLoggedOut())
          .ifPresentOrElse(
              user ->
                  SecurityContextHolder.getContext()
                      .setAuthentication(
                          new UsernamePasswordAuthenticationToken(
                              user, user.getPassword(), user.getAuthorities())),
              () -> clearSession(response));
    } catch (JWTVerificationException exception) {
      clearSession(response);
    }
  }

  private void clearSession(HttpServletResponse response) {
    SecurityContextHolder.clearContext();
    sessionCookieService.deleteSessionCookie(response);
  }
}
