package com.example.todo.components;

import com.example.todo.entities.UserEntity;
import com.example.todo.repositories.UserRepository;
import com.example.todo.services.JwtService;
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
import org.springframework.web.util.WebUtils;

@Component
@AllArgsConstructor
public class JwtAuthenticationFilterComponent extends OncePerRequestFilter {
  @NonNull private final JwtService jwtService;

  @NonNull private final UserRepository userRepository;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws IOException, ServletException {
    if (SecurityContextHolder.getContext().getAuthentication() != null) {
      Cookie cookie = WebUtils.getCookie(request, "token");
      if (cookie != null) {
        String username = jwtService.decodeJwt(cookie.getValue());
        UserEntity user = userRepository.findByUsername(username);
        if (user.isEnabled()) {
          UsernamePasswordAuthenticationToken authToken =
              new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
          authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
          SecurityContextHolder.getContext().setAuthentication(authToken);
        }
      }
    }
    filterChain.doFilter(request, response);
  }
}
