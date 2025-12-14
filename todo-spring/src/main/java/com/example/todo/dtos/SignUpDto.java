package com.example.todo.dtos;

import com.example.todo.enums.RoleEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.Set;
import lombok.Data;

@Data
public class SignUpDto {
  @NotBlank
  @Size(min = 1, max = 255)
  private String username;

  @NotBlank
  @Size(min = 1, max = 255)
  private String password;

  @NotEmpty
  @Size(min = 1, max = 10)
  private Set<RoleEnum> roles;
}
