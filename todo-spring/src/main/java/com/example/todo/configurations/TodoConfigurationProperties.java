package com.example.todo.configurations;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Centralised, type-safe application configuration.
 *
 * <p>Every class that needs application settings should depend on this bean instead of injecting
 * individual {@code @Value} properties. This keeps configuration in one place and makes it
 * discoverable through the Spring Boot configuration metadata.
 *
 * @author Todo Team
 */
@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "todo")
public class TodoConfigurationProperties {

  @Valid @NotNull private final Jwt jwt = new Jwt();

  @Valid @NotNull private final Cookie cookie = new Cookie();

  @Valid @NotNull private final Cors cors = new Cors();

  /** JWT signing and lifetime configuration. */
  @Getter
  @Setter
  public static class Jwt {

    @NotBlank private String secret;

    @Positive private int expiry = 86400;
  }

  /** Session cookie configuration. */
  @Getter
  @Setter
  public static class Cookie {

    @NotBlank private String name = "token";

    @NotBlank private String path = "/";

    @NotBlank private String sameSite = "Strict";

    private boolean httpOnly = true;

    private boolean secure;
  }

  /** CORS configuration used by the security filter chain. */
  @Getter
  @Setter
  public static class Cors {

    @NotEmpty private List<String> allowedOrigins = List.of("http://localhost:4200");

    @NotEmpty
    private List<String> allowedMethods =
        List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");

    @NotEmpty private List<String> allowedHeaders = List.of("*");
  }
}
