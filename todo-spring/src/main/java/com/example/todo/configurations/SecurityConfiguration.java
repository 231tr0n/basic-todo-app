package com.example.todo.configurations;

import com.example.todo.components.JwtAuthenticationFilterComponent;
import com.example.todo.constants.Constants;
import com.example.todo.entities.UserEntity;
import com.example.todo.repositories.UserRepository;
import java.util.List;
import lombok.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.core.GrantedAuthorityDefaults;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfiguration {
  private final JwtAuthenticationFilterComponent jwtAuthenticationFilterComponent;
  private final UserRepository userRepository;

  public SecurityConfiguration(
      JwtAuthenticationFilterComponent jwtAuthenticationFilterComponent,
      UserRepository userRepository,
      @NonNull @Value("${server.host}") String host,
      @Value("${server.port}") long port) {
    this.jwtAuthenticationFilterComponent = jwtAuthenticationFilterComponent;
    this.userRepository = userRepository;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    return http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(csrf -> csrf.disable())
        .formLogin(form -> form.disable())
        .httpBasic(httpBasic -> httpBasic.disable())
        .logout(logout -> logout.disable())
        .redirectToHttps(redirect -> redirect.disable())
        .authenticationProvider(authenticationProvider())
        .anonymous(anonymous -> anonymous.disable())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .addFilterBefore(
            jwtAuthenticationFilterComponent, UsernamePasswordAuthenticationFilter.class)
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers("/api/signup")
                    .permitAll()
                    .requestMatchers("/api/user", "/api/todos", "/api/todos/**", "/api/signout")
                    .authenticated()
                    .requestMatchers("/actuator/**")
                    .hasRole(Constants.ADMIN_AUTHORITY)
                    .anyRequest()
                    .permitAll())
        .build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH"));
    configuration.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }

  @Bean
  public AuthenticationProvider authenticationProvider() {
    DaoAuthenticationProvider authenticationProvider =
        new DaoAuthenticationProvider(
            username -> {
              UserEntity user = userRepository.findByUsernameAndFetchAuthorities(username);
              if (user == null) {
                throw new UsernameNotFoundException("User not found");
              }
              return user;
            });
    authenticationProvider.setPasswordEncoder(passwordEncoder());
    return authenticationProvider;
  }

  @Bean
  public BCryptPasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(10);
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration config) {
    return config.getAuthenticationManager();
  }

  @Bean
  public GrantedAuthorityDefaults grantedAuthorityDefaults() {
    return new GrantedAuthorityDefaults("");
  }
}
