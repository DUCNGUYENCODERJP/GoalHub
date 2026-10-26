package com.goalhub.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("DataSeeder Profile Configuration Test")
class DataSeederTest {

    @Test
    @DisplayName("DataSeeder must be restricted to dev profile only")
    void dataSeederIsRestrictedToDevProfile() {
        Profile profileAnnotation = DataSeeder.class.getAnnotation(Profile.class);

        assertThat(profileAnnotation)
                .as("DataSeeder must be annotated with @Profile")
                .isNotNull();

        assertThat(profileAnnotation.value())
                .as("DataSeeder must only be active in 'dev' profile")
                .containsExactly("dev");
    }
}
