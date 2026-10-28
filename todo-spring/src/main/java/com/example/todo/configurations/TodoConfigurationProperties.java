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

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "todo")
public class TodoConfigurationProperties {

  @Valid @NotNull private final Jwt jwt = new Jwt();

  @Valid @NotNull private final Cookie cookie = new Cookie();

  @Valid @NotNull private final Cors cors = new Cors();

  @Valid @NotNull private final Ai ai = new Ai();

  @Getter
  @Setter
  public static class Jwt {

    @NotBlank private String secret;

    @Positive private int expiry = 86400;
  }

  @Getter
  @Setter
  public static class Cookie {

    @NotBlank private String name = "token";

    @NotBlank private String path = "/";

    @NotBlank private String sameSite = "Strict";

    private boolean httpOnly = true;

    private boolean secure;
  }

  @Getter
  @Setter
  public static class Cors {

    @NotEmpty private List<String> allowedOrigins = List.of("http://localhost:4200");

    @NotEmpty
    private List<String> allowedMethods =
        List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");

    @NotEmpty private List<String> allowedHeaders = List.of("*");
  }

  @Getter
  @Setter
  public static class Ai {

    @NotBlank private String baseUrl = "http://localhost:11434";
  }
}
