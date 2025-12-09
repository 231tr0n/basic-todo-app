package com.example.todo.components;

import com.example.todo.entities.UserEntity;
import com.example.todo.services.AuthenticationService;
import com.example.todo.services.JwtService;
import com.example.todo.services.SessionCookieService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@AllArgsConstructor
public class JwtAuthenticationFilterComponent extends OncePerRequestFilter {
  @NonNull private final JwtService jwtService;

  @NonNull private final AuthenticationService authenticationService;

  @NonNull private final SessionCookieService sessionCookieService;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws IOException, ServletException {
    if (SecurityContextHolder.getContext().getAuthentication() != null) {
      Cookie cookie = sessionCookieService.getSessionCookie(request);
      if (cookie != null) {
        String username = jwtService.decodeJwt(cookie.getValue());
        UserEntity user = authenticationService.loadUserByUsername(username);
        if (user.isEnabled() && !user.isLoggedOut()) {
          UsernamePasswordAuthenticationToken authToken =
              new UsernamePasswordAuthenticationToken(
                  user, user.getPassword(), user.getAuthorities());
          authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
          SecurityContextHolder.getContext().setAuthentication(authToken);
        } else {
          SecurityContextHolder.clearContext();
          response.addCookie(sessionCookieService.deleteSessionCookie());
        }
      }
    }
    filterChain.doFilter(request, response);
  }
}
