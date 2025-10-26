package com.example.todo.configurations;

import com.example.todo.components.JwtAuthenticationComponent;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@AllArgsConstructor
public class AuthConfiguration {
  @NonNull private final JwtAuthenticationComponent jwtAuthenticationComponent;

  @Bean
  SecurityFilterChain securityFilterChain(
      org.springframework.security.config.annotation.web.builders.HttpSecurity http)
      throws Exception {
    return http.csrf(csrf -> csrf.disable())
        .authorizeHttpRequests(
            auth -> auth.requestMatchers("/api/auth/**").permitAll().anyRequest().authenticated())
        .addFilterBefore(jwtAuthenticationComponent, UsernamePasswordAuthenticationFilter.class)
        .build();
  }
}
