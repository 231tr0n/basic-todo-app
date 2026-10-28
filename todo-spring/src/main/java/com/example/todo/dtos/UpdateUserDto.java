package com.example.todo.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;
import java.util.Set;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateUserDto {
  @JsonProperty(required = false)
  @Size(min = 1, max = 255)
  private String username;

  @JsonProperty(required = false)
  @Size(max = 10)
  private Set<String> authorities;
}
