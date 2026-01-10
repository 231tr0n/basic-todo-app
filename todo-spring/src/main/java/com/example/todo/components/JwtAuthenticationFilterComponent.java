package com.example.todo.components;

import com.example.todo.entities.UserEntity;
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
      Cookie cookie = sessionCookieService.getSessionCookie(request);
      if (cookie != null) {
        String username = jwtService.decodeJwt(cookie.getValue());
        UserEntity user = userRepository.findByUsernameAndFetchAuthorities(username);
        if (user != null && user.isEnabled() && !user.isLoggedOut()) {
          SecurityContextHolder.getContext()
              .setAuthentication(
                  new UsernamePasswordAuthenticationToken(
                      user, user.getPassword(), user.getAuthorities()));
        } else {
          SecurityContextHolder.clearContext();
          sessionCookieService.deleteSessionCookie(response);
        }
      }
    }
    filterChain.doFilter(request, response);
  }
}
