package com.example.todo.configurations;

import com.example.todo.components.JwtAuthenticationFilterComponent;
import com.example.todo.enums.RoleEnum;
import com.example.todo.services.GlobalService;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

@Configuration
@AllArgsConstructor
public class AuthenticationConfiguration {
  @NonNull private final JwtAuthenticationFilterComponent jwtAuthenticationFilterComponent;

  @NonNull private final GlobalService globalService;

  @NonNull
  @Value("${server.host}")
  private final String host;

  @Value("${server.port}")
  private final long port;

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    DaoAuthenticationProvider authenticationProvider = new DaoAuthenticationProvider(globalService);
    authenticationProvider.setPasswordEncoder(new BCryptPasswordEncoder(10));

    return http.cors(
            cors ->
                cors.configurationSource(
                    configurationSource -> {
                      CorsConfiguration configuration = new CorsConfiguration();
                      configuration.setAllowedOrigins(
                          List.of(String.format("http://%s:%d", host, port)));
                      configuration.setAllowedMethods(
                          List.of("GET", "POST", "PUT", "DELETE", "PATCH"));
                      configuration.setAllowCredentials(true);
                      return configuration;
                    }))
        .csrf(csrf -> csrf.disable())
        .formLogin(form -> form.disable())
        .httpBasic(httpBasic -> httpBasic.disable())
        .logout(logout -> logout.disable())
        .redirectToHttps(Customizer.withDefaults())
        .authenticationProvider(authenticationProvider)
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers("/api/user")
                    .hasRole(RoleEnum.USER.toString())
                    .requestMatchers("/api/todo")
                    .hasRole(RoleEnum.USER.toString())
                    .requestMatchers("/actuator/**")
                    .hasRole(RoleEnum.ADMIN.toString())
                    .anyRequest()
                    .permitAll())
        .addFilterBefore(
            jwtAuthenticationFilterComponent, UsernamePasswordAuthenticationFilter.class)
        .build();
  }
}
