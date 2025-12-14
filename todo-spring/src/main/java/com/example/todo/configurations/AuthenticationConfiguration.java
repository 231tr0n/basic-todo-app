package com.example.todo.configurations;

import com.example.todo.components.JwtAuthenticationFilterComponent;
import com.example.todo.enums.RoleEnum;
import com.example.todo.repositories.UserRepository;
import java.util.List;
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
public class AuthenticationConfiguration {
  private final JwtAuthenticationFilterComponent jwtAuthenticationFilterComponent;

  private final UserRepository userRepository;

  private final String host;

  private final long port;

  public AuthenticationConfiguration(
      JwtAuthenticationFilterComponent jwtAuthenticationFilterComponent,
      UserRepository userRepository,
      @NonNull @Value("${server.host}") String host,
      @Value("${server.port}") long port) {
    this.jwtAuthenticationFilterComponent = jwtAuthenticationFilterComponent;
    this.userRepository = userRepository;
    this.host = host;
    this.port = port;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    DaoAuthenticationProvider authenticationProvider =
        new DaoAuthenticationProvider(username -> userRepository.findByUsername(username));
    authenticationProvider.setPasswordEncoder(passwordEncoder());

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

  @Bean
  public BCryptPasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(10);
  }
}
