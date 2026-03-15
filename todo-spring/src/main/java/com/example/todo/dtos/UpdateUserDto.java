package com.example.todo.dtos;

import jakarta.validation.constraints.Size;
import java.util.Optional;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateUserDto {
  @Size(min = 1, max = 255)
  private Optional<String> username;

  @Size(min = 0, max = 10)
  private Optional<Set<String>> authorities;
}
